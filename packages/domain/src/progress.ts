import { type GoalHistoryEntry, goalForDate } from './goal.js';
import { addDays, type LocalDate } from './local-date.js';

/** Daily totals in ml keyed by `YYYY-MM-DD`, as returned by `dailyTotals`. */
export type DailyTotals = ReadonlyMap<string, number>;

/**
 * Whether a total met a goal. `null` when no goal was in effect: such a day
 * counts neither as met nor as missed.
 */
function metGoal(totalMl: number, goalMl: number | null): boolean | null {
  return goalMl === null ? null : totalMl >= goalMl;
}

/** Whether the day met the goal in effect on it (`null` = no goal). */
export function isDayMet(
  date: LocalDate,
  totals: DailyTotals,
  goalHistory: readonly GoalHistoryEntry[],
): boolean | null {
  return metGoal(totals.get(date) ?? 0, goalForDate(goalHistory, date));
}

/**
 * Consecutive days meeting the goal, counting backwards from `today`.
 *
 * Today only counts if it is already met. If it is not, counting starts from
 * yesterday, so an unfinished day does not break the streak. A day without a
 * goal can only come before the earliest active goal's `effectiveFrom`, so
 * reaching one ends the count.
 */
export function currentStreak(
  today: LocalDate,
  totals: DailyTotals,
  goalHistory: readonly GoalHistoryEntry[],
): number {
  let streak = isDayMet(today, totals, goalHistory) === true ? 1 : 0;
  let date = addDays(today, -1);
  while (isDayMet(date, totals, goalHistory) === true) {
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}

export interface DayStats {
  date: LocalDate;
  totalMl: number;
  dailyGoalMl: number | null;
  /** `null` when no goal was in effect: neither met nor missed. */
  met: boolean | null;
}

export interface PeriodStats {
  /** One item per day, oldest first, ending at `endDate`. */
  days: DayStats[];
  daysMet: number;
  /** Rounded to whole ml. `null` if no day in the period has an entry. */
  averageMl: number | null;
}

/**
 * Stats for the `days` days ending at `endDate` (inclusive), e.g. 7 or 30.
 *
 * The average only counts days with at least one entry. Days before the user
 * started (or days they simply did not log) would otherwise pull the average
 * down and make it say little about how much they drink on a logged day.
 */
export function periodStats(
  endDate: LocalDate,
  days: number,
  totals: DailyTotals,
  goalHistory: readonly GoalHistoryEntry[],
): PeriodStats {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`days must be a positive integer, got ${days}`);
  }

  const result: DayStats[] = [];
  let daysMet = 0;
  let loggedDays = 0;
  let loggedMl = 0;

  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDays(endDate, -offset);
    const totalMl = totals.get(date) ?? 0;
    const dailyGoalMl = goalForDate(goalHistory, date);
    const met = metGoal(totalMl, dailyGoalMl);
    if (met === true) {
      daysMet++;
    }
    if (totals.has(date)) {
      loggedDays++;
      loggedMl += totalMl;
    }
    result.push({ date, totalMl, dailyGoalMl, met });
  }

  return {
    days: result,
    daysMet,
    averageMl: loggedDays === 0 ? null : Math.round(loggedMl / loggedDays),
  };
}
