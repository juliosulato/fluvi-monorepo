import type { LocalDate } from './local-date.js';
import {
  type DeletedAt,
  isActive,
  type Timestamp,
  timestampMs,
} from './sync-record.js';

/** Limits for a goal the user picks in the app. */
export const GOAL_MIN_ML = 1000;
export const GOAL_MAX_ML = 6000;
export const GOAL_STEP_ML = 50;

/**
 * Wider limits for goals arriving through sync, used by the sync schemas in
 * `@fluvi/contracts`. A record from another client or app version is never
 * rejected just because the app's input rules are stricter.
 */
export const SYNC_GOAL_MIN_ML = 500;
export const SYNC_GOAL_MAX_ML = 10_000;

/** Water per kilogram of body weight used by the suggestion. */
const ML_PER_KG = 35;

/** Provisional value: kept in a single exported constant so it is easy to tune. */
export const HIGH_ACTIVITY_BONUS_ML = 1000;

export const ACTIVITY_LEVELS = ['none', 'moderate', 'high'] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

/**
 * True if `value` is a known activity level. Use it at the app's boundaries
 * (reading SQLite, applying a pull): a level added in a later release is
 * unknown to an older app.
 */
export function isActivityLevel(value: unknown): value is ActivityLevel {
  return (ACTIVITY_LEVELS as readonly unknown[]).includes(value);
}

const ACTIVITY_BONUS_ML: Record<ActivityLevel, number> = {
  none: 0,
  moderate: 500,
  high: HIGH_ACTIVITY_BONUS_ML,
};

/**
 * `weight_kg × 35 + activity bonus`, rounded to the nearest multiple of 50
 * (half up) and clamped to [1000, 6000].
 *
 * The math runs in thousandths of a millilitre so it stays in integers:
 * `weightGrams × 35` is already ml × 1000.
 *
 * Throws `RangeError` for an unknown `activity` (e.g. a stale stored value),
 * instead of returning `NaN`.
 */
export function suggestGoalMl(
  weightGrams: number,
  activity: ActivityLevel,
): number {
  if (!isActivityLevel(activity)) {
    throw new RangeError(`Unknown activity level: ${activity}`);
  }
  const milliMl = weightGrams * ML_PER_KG + ACTIVITY_BONUS_ML[activity] * 1000;
  const stepMilliMl = GOAL_STEP_ML * 1000;
  const roundedMl =
    Math.floor((milliMl + stepMilliMl / 2) / stepMilliMl) * GOAL_STEP_ML;
  return Math.min(GOAL_MAX_ML, Math.max(GOAL_MIN_ML, roundedMl));
}

/** Validates a goal picked in the app. */
export function isValidGoalMl(ml: number): boolean {
  return (
    Number.isInteger(ml) &&
    ml >= GOAL_MIN_ML &&
    ml <= GOAL_MAX_ML &&
    ml % GOAL_STEP_ML === 0
  );
}

/** Validates a goal arriving through sync (wider, no step). */
export function isValidSyncGoalMl(ml: number): boolean {
  return (
    Number.isInteger(ml) && ml >= SYNC_GOAL_MIN_ML && ml <= SYNC_GOAL_MAX_ML
  );
}

export function shouldSuggestGoalUpdate(
  currentGoalMl: number,
  suggestedGoalMl: number,
): boolean {
  return currentGoalMl !== suggestedGoalMl;
}

export interface GoalHistoryEntry {
  effectiveFrom: string;
  dailyGoalMl: number;
  updatedAt: Timestamp;
  deletedAt?: DeletedAt;
}

/** True if `a` should win over `b` as the goal in effect. */
function supersedes(a: GoalHistoryEntry, b: GoalHistoryEntry): boolean {
  if (a.effectiveFrom !== b.effectiveFrom) {
    return a.effectiveFrom > b.effectiveFrom;
  }
  const aUpdated = timestampMs(a.updatedAt);
  const bUpdated = timestampMs(b.updatedAt);
  if (aUpdated !== bUpdated) {
    return aUpdated > bUpdated;
  }
  return a.dailyGoalMl > b.dailyGoalMl;
}

/**
 * The goal in effect on `date`: among active (not deleted) entries, the one
 * with the latest `effectiveFrom` on or before `date`, or `null` if none.
 *
 * Rule: there is one goal per day. When the user changes the goal on a day
 * that already has one, the app updates that day's record instead of creating
 * another. Duplicates for the same `effectiveFrom` only appear when two
 * offline devices each create a goal for the same day; sync resolves them
 * (the latest `updatedAt` wins and the other is marked as deleted).
 *
 * As a defence, this function still tolerates duplicates, applying the same
 * rule: the latest `updatedAt` wins, then the larger `dailyGoalMl`. The result
 * never depends on the order of the list, because that order is not stable
 * across devices.
 */
export function goalForDate(
  history: readonly GoalHistoryEntry[],
  date: LocalDate,
): number | null {
  let best: GoalHistoryEntry | null = null;
  for (const entry of history) {
    if (
      isActive(entry) &&
      entry.effectiveFrom <= date &&
      (best === null || supersedes(entry, best))
    ) {
      best = entry;
    }
  }
  return best?.dailyGoalMl ?? null;
}
