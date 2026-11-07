import type { LocalDate } from './local-date.js';
import {
  type DeletedAt,
  isActive,
  type Timestamp,
  timestampMs,
} from './sync-record.js';

export const WEIGHT_MIN_GRAMS = 20_000;
export const WEIGHT_MAX_GRAMS = 400_000;
/** Weights entered in the app have one decimal place in kg. */
const WEIGHT_STEP_GRAMS = 100;

export interface WeightEntry {
  weightGrams: number;
  localDate: string;
  updatedAt: Timestamp;
  deletedAt?: DeletedAt;
}

/** Validates a weight entered in the app (one decimal place). */
export function isValidWeightGrams(grams: number): boolean {
  return isValidSyncWeightGrams(grams) && grams % WEIGHT_STEP_GRAMS === 0;
}

/** Validates a weight arriving through sync (same range, no step). */
export function isValidSyncWeightGrams(grams: number): boolean {
  return (
    Number.isInteger(grams) &&
    grams >= WEIGHT_MIN_GRAMS &&
    grams <= WEIGHT_MAX_GRAMS
  );
}

const WEIGHT_INPUT_PATTERN = /^(\d+)(?:[.,](\d))?$/;

/**
 * Parses what the user typed, in kg, into grams. Accepts `70`, `70,5` and
 * `70.5` (at most one decimal place, surrounding spaces ignored). The digits
 * are converted as strings, never through a float. Returns `null` if the text
 * is not a weight or is out of range.
 */
export function parseWeightInput(text: string): number | null {
  const match = WEIGHT_INPUT_PATTERN.exec(text.trim());
  if (!match) {
    return null;
  }
  const grams = Number(match[1]) * 1000 + Number(match[2] ?? '0') * 100;
  return isValidWeightGrams(grams) ? grams : null;
}

export function hasWeightForDate(
  entries: readonly WeightEntry[],
  date: LocalDate,
): boolean {
  return entries.some((entry) => isActive(entry) && entry.localDate === date);
}

/** True if `a` should win over `b` as the weight of their (shared) day. */
function supersedes(a: WeightEntry, b: WeightEntry): boolean {
  const aUpdated = timestampMs(a.updatedAt);
  const bUpdated = timestampMs(b.updatedAt);
  if (aUpdated !== bUpdated) {
    return aUpdated > bUpdated;
  }
  return a.weightGrams > b.weightGrams;
}

/**
 * Grams gained (positive) or lost (negative) between the two most recent days
 * with an active entry. `null` with fewer than two such days.
 *
 * There is one weight per day. When the user logs a weight on a day that
 * already has one, the app updates that day's record instead of creating
 * another. Duplicates for the same `localDate` only appear when two offline
 * devices each log a weight for the same day; sync resolves them (the latest
 * `updatedAt` wins and the other is marked as deleted).
 *
 * As a defence, this function still tolerates duplicates, applying the same
 * rule: the latest `updatedAt` wins, then the larger `weightGrams`. The result
 * never depends on the order of the list.
 */
export function weightChange(entries: readonly WeightEntry[]): number | null {
  const byDay = new Map<string, WeightEntry>();
  for (const entry of entries) {
    if (!isActive(entry)) {
      continue;
    }
    const current = byDay.get(entry.localDate);
    if (current === undefined || supersedes(entry, current)) {
      byDay.set(entry.localDate, entry);
    }
  }

  let latest: WeightEntry | undefined;
  let previous: WeightEntry | undefined;
  for (const entry of byDay.values()) {
    if (latest === undefined || entry.localDate > latest.localDate) {
      previous = latest;
      latest = entry;
    } else if (previous === undefined || entry.localDate > previous.localDate) {
      previous = entry;
    }
  }

  if (latest === undefined || previous === undefined) {
    return null;
  }
  return latest.weightGrams - previous.weightGrams;
}
