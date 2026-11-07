declare const localDateBrand: unique symbol;

/**
 * A calendar date in `YYYY-MM-DD` format, with no time and no time zone,
 * between years 1000 and 9999.
 *
 * Because the format is fixed-width and zero-padded, dates compare correctly
 * with the plain string operators (`<`, `<=`, `===`).
 *
 * The brand marks values that went through `parseLocalDate`,
 * `localDateFromDate` or `addDays`. Record types (`WaterLog`, ...) take a
 * plain `string`, so rows read from the database can be passed as they are.
 * Validating dates when they are written (with `isLocalDate`) is the caller's
 * job; they are not re-validated on every read.
 */
export type LocalDate = string & { readonly [localDateBrand]: true };

const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;
const MIN_YEAR = 1000;
const MAX_YEAR = 9999;

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function format(year: number, month: number, day: number): LocalDate {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`Year out of range: ${year}`);
  }
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as LocalDate;
}

function formatUtc(ms: number): LocalDate {
  const date = new Date(ms);
  return format(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/**
 * Milliseconds at UTC midnight of `YYYY-MM-DD`. Only called with years
 * 1000-9999, so `Date.UTC`'s mapping of years 0-99 to 1900-1999 never applies.
 */
function toUtcMs(date: string): number {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  return Date.UTC(year, month - 1, day);
}

/**
 * True if `value` is a real calendar date in `YYYY-MM-DD` format
 * (`2024-02-29` is valid, `2023-02-29` is not). Years below 1000 are rejected.
 */
export function isLocalDate(value: string): value is LocalDate {
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match || Number(match[1]) < MIN_YEAR) {
    return false;
  }
  return formatUtc(toUtcMs(value)) === value;
}

/** Same as `isLocalDate`, but returns the branded value or throws `RangeError`. */
export function parseLocalDate(value: string): LocalDate {
  if (!isLocalDate(value)) {
    throw new RangeError(`Invalid LocalDate: ${value}`);
  }
  return value;
}

/**
 * The calendar date of an instant in the device's time zone. This is the only
 * place where local time is used; everything else works on `LocalDate`.
 * Throws `RangeError` for an invalid `Date`.
 */
export function localDateFromDate(date: Date): LocalDate {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Invalid Date');
  }
  return format(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Adds (or subtracts, with a negative `days`) whole calendar days. Throws
 * `RangeError` if the result falls outside years 1000-9999.
 */
export function addDays(date: LocalDate, days: number): LocalDate {
  return formatUtc(toUtcMs(date) + days * MS_PER_DAY);
}
