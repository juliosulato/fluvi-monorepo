export {
  ACTIVITY_LEVELS,
  type ActivityLevel,
  GOAL_MAX_ML,
  GOAL_MIN_ML,
  GOAL_STEP_ML,
  type GoalHistoryEntry,
  goalForDate,
  HIGH_ACTIVITY_BONUS_ML,
  isActivityLevel,
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
  isValidSyncQuickAmountsMl,
  isValidSyncWaterMl,
  isValidWaterMl,
  QUICK_AMOUNT_COUNT,
  SYNC_WATER_LOG_MAX_ML,
  WATER_LOG_MAX_ML,
  WATER_LOG_MIN_ML,
  type WaterLog,
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
