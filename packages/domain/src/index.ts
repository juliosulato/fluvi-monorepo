export {
  type ActivityLevel,
  GOAL_MAX_ML,
  GOAL_MIN_ML,
  GOAL_STEP_ML,
  type GoalHistoryEntry,
  goalForDate,
  HIGH_ACTIVITY_BONUS_ML,
  isValidGoalMl,
  isValidSyncGoalMl,
  SYNC_GOAL_MAX_ML,
  SYNC_GOAL_MIN_ML,
  shouldSuggestGoalUpdate,
  suggestGoalMl,
} from './goal.js';
export {
  addDays,
  isLocalDate,
  type LocalDate,
  localDateFromDate,
  parseLocalDate,
} from './local-date.js';
export {
  currentStreak,
  type DailyTotals,
  type DayStats,
  isDayMet,
  type PeriodStats,
  periodStats,
} from './progress.js';
export type { DeletedAt, Timestamp } from './sync-record.js';
export {
  dailyTotals,
  isValidSyncWaterMl,
  isValidWaterMl,
  SYNC_WATER_ENTRY_MAX_ML,
  WATER_ENTRY_MAX_ML,
  WATER_ENTRY_MIN_ML,
  type WaterEntry,
} from './water.js';
export {
  hasWeightForDate,
  isValidSyncWeightGrams,
  isValidWeightGrams,
  parseWeightInput,
  WEIGHT_MAX_GRAMS,
  WEIGHT_MIN_GRAMS,
  type WeightEntry,
  weightChange,
} from './weight.js';
