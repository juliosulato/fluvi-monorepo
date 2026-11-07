import { type DeletedAt, isActive } from './sync-record.js';

/** Limits for a single entry logged in the app. */
export const WATER_ENTRY_MIN_ML = 1;
export const WATER_ENTRY_MAX_ML = 3000;

/** Wider upper limit for entries arriving through sync (API validation). */
export const SYNC_WATER_ENTRY_MAX_ML = 5000;

export interface WaterEntry {
  amountMl: number;
  localDate: string;
  deletedAt?: DeletedAt;
}

/** Validates an entry logged in the app. */
export function isValidWaterMl(ml: number): boolean {
  return (
    Number.isInteger(ml) && ml >= WATER_ENTRY_MIN_ML && ml <= WATER_ENTRY_MAX_ML
  );
}

/** Validates an entry arriving through sync. */
export function isValidSyncWaterMl(ml: number): boolean {
  return (
    Number.isInteger(ml) &&
    ml >= WATER_ENTRY_MIN_ML &&
    ml <= SYNC_WATER_ENTRY_MAX_ML
  );
}

/**
 * Total ml per day (`YYYY-MM-DD` key). Deleted entries are ignored, so a day
 * only appears in the map if it has at least one active entry.
 */
export function dailyTotals(
  entries: readonly WaterEntry[],
): Map<string, number> {
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
