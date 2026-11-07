/**
 * Instant from the sync columns. The sync contract carries milliseconds since
 * the epoch; rows read through Drizzle (`timestamp_ms` in the app's SQLite,
 * `timestamp` with `mode: 'date'` in the API's Postgres) come back as `Date`.
 * Both are accepted.
 */
export type Timestamp = Date | number;

/**
 * Soft-delete marker, in whatever shape the caller has it: `Date` from Drizzle,
 * milliseconds from the contract, or a string. The domain never reads the
 * value; it only checks whether it is empty (`null` or missing = active).
 */
export type DeletedAt = Date | number | string | null | undefined;

export function isActive(entry: { deletedAt?: DeletedAt }): boolean {
  return entry.deletedAt === null || entry.deletedAt === undefined;
}

export function timestampMs(value: Timestamp): number {
  return typeof value === 'number' ? value : value.getTime();
}
