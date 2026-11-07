import { type DeletedAt, isActive } from './sync-record.js';

/** Limits for a single entry logged in the app. */
export const WATER_LOG_MIN_ML = 1;
export const WATER_LOG_MAX_ML = 3000;

/** Wider upper limit for entries arriving through sync (API validation). */
export const SYNC_WATER_LOG_MAX_ML = 5000;

export interface WaterLog {
  amountMl: number;
  localDate: string;
  deletedAt?: DeletedAt;
}

/** Validates an entry logged in the app. */
export function isValidWaterMl(ml: number): boolean {
  return (
    Number.isInteger(ml) && ml >= WATER_LOG_MIN_ML && ml <= WATER_LOG_MAX_ML
  );
}

/** Validates an entry arriving through sync. */
export function isValidSyncWaterMl(ml: number): boolean {
  return (
    Number.isInteger(ml) &&
    ml >= WATER_LOG_MIN_ML &&
    ml <= SYNC_WATER_LOG_MAX_ML
  );
}

/** Number of quick-add amounts the user keeps in the app. */
export const QUICK_AMOUNT_COUNT = 3;

/**
 * Validates the quick-add amounts arriving through sync: exactly
 * `QUICK_AMOUNT_COUNT` values, each a valid sync water amount.
 */
export function isValidSyncQuickAmountsMl(values: readonly number[]): boolean {
  return (
    values.length === QUICK_AMOUNT_COUNT &&
    values.every((ml) => isValidSyncWaterMl(ml))
  );
}

/**
 * Total ml per day (`YYYY-MM-DD` key). Deleted entries are ignored, so a day
 * only appears in the map if it has at least one active entry.
 */
export function dailyTotals(entries: readonly WaterLog[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (isActive(entry)) {
      totals.set(
        entry.localDate,
        (totals.get(entry.localDate) ?? 0) + entry.amountMl,
      );
    }
  }
  return totals;
}
