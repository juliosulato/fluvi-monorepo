import { describe, expect, it } from 'vitest';
import {
  type ActivityLevel,
  type GoalHistoryEntry,
  goalForDate,
  HIGH_ACTIVITY_BONUS_ML,
  isActivityLevel,
  isValidGoalMl,
  isValidSyncGoalMl,
  shouldSuggestGoalUpdate,
  suggestGoalMl,
} from './goal.js';
import { parseLocalDate as d } from './local-date.js';

describe('suggestGoalMl', () => {
  it.each<[string, number, ActivityLevel, number]>([
    ['prototype value', 70_000, 'moderate', 2950],
    ['no activity', 70_000, 'none', 2450],
    ['high activity', 70_000, 'high', 2450 + HIGH_ACTIVITY_BONUS_ML],
    // 70.5 kg × 35 = 2467.5, below the halfway point 2475 → 2450
    ['fractional kg rounds down', 70_500, 'none', 2450],
    // 70.7 kg × 35 = 2474.5, just below 2475 → 2450
    ['just below half', 70_700, 'none', 2450],
    // 65 kg × 35 = 2275, exactly halfway between 2250 and 2300 → up
    ['exactly half rounds up', 65_000, 'none', 2300],
    // 66.5 kg × 35 = 2327.5, above the halfway point 2325 → 2350
    ['above half', 66_500, 'none', 2350],
    ['clamp low', 20_000, 'none', 1000],
    ['clamp low with bonus', 10_000, 'moderate', 1000],
    ['clamp high', 400_000, 'high', 6000],
    ['clamp high boundary', 150_000, 'high', 6000],
  ])('%s: %i g + %s = %i ml', (_label, grams, activity, expected) => {
    expect(suggestGoalMl(grams, activity)).toBe(expected);
  });

  it.each(['low', 'toString', 'constructor'])(
    'throws on unknown activity %j instead of returning NaN',
    (activity) => {
      expect(() => suggestGoalMl(70_000, activity as ActivityLevel)).toThrow(
        RangeError,
      );
    },
  );
});

describe('isActivityLevel', () => {
  it.each<[unknown, boolean]>([
    ['none', true],
    ['moderate', true],
    ['high', true],
    ['low', false],
    ['extreme', false],
    ['HIGH', false],
    ['', false],
    ['toString', false],
    ['constructor', false],
    [null, false],
    [undefined, false],
    [1, false],
  ])('%j → %s', (value, expected) => {
    expect(isActivityLevel(value)).toBe(expected);
  });
});

describe('isValidSyncGoalMl', () => {
  it.each([
    [500, true],
    [10_000, true],
    [2975, true],
    [499, false],
    [10_001, false],
    [2950.5, false],
  ])('%d → %s', (ml, expected) => {
    expect(isValidSyncGoalMl(ml)).toBe(expected);
  });
});

describe('isValidGoalMl', () => {
  it.each([
    [1000, true],
    [6000, true],
    [2950, true],
    [950, false],
    [6050, false],
    [2975, false],
    [2950.5, false],
    [Number.NaN, false],
  ])('%d → %s', (ml, expected) => {
    expect(isValidGoalMl(ml)).toBe(expected);
  });
});

describe('shouldSuggestGoalUpdate', () => {
  it.each([
    [2950, 2950, false],
    [2950, 3000, true],
  ])('%i vs %i → %s', (current, suggested, expected) => {
    expect(shouldSuggestGoalUpdate(current, suggested)).toBe(expected);
  });
});

describe('goalForDate', () => {
  const history: GoalHistoryEntry[] = [
    { effectiveFrom: d('2024-03-10'), dailyGoalMl: 3000, updatedAt: 0 },
    { effectiveFrom: d('2024-01-01'), dailyGoalMl: 2000, updatedAt: 0 },
    { effectiveFrom: d('2024-02-15'), dailyGoalMl: 2500, updatedAt: 0 },
  ];

  it.each([
    ['2023-12-31', null],
    ['2024-01-01', 2000],
    ['2024-02-14', 2000],
    ['2024-02-15', 2500],
    ['2024-03-09', 2500],
    ['2024-03-10', 3000],
    ['2030-01-01', 3000],
  ])('%s → %s', (date, expected) => {
    expect(goalForDate(history, d(date))).toBe(expected);
  });

  it('returns null for an empty history', () => {
    expect(goalForDate([], d('2024-01-01'))).toBeNull();
  });

  // Every permutation of the list must give the same answer.
  const permutations = (list: GoalHistoryEntry[]): GoalHistoryEntry[][] =>
    list.length <= 1
      ? [list]
      : list.flatMap((item, i) =>
          permutations([...list.slice(0, i), ...list.slice(i + 1)]).map(
            (rest) => [item, ...rest],
          ),
        );

  it('same-day changes: latest updatedAt wins, regardless of order', () => {
    const sameDay: GoalHistoryEntry[] = [
      { effectiveFrom: d('2024-01-01'), dailyGoalMl: 2000, updatedAt: 1 },
      // Morning: raised to 3000. Afternoon: lowered to 2500 (Date, as Drizzle).
      { effectiveFrom: d('2024-02-01'), dailyGoalMl: 3000, updatedAt: 1000 },
      {
        effectiveFrom: d('2024-02-01'),
        dailyGoalMl: 2500,
        updatedAt: new Date(2000),
      },
      { effectiveFrom: d('2024-02-01'), dailyGoalMl: 3500, updatedAt: 500 },
    ];
    for (const order of permutations(sameDay)) {
      expect(goalForDate(order, d('2024-02-01'))).toBe(2500);
      expect(goalForDate(order, d('2024-01-31'))).toBe(2000);
    }
  });

  it('same effectiveFrom and updatedAt: larger goal wins, regardless of order', () => {
    const tied: GoalHistoryEntry[] = [
      { effectiveFrom: d('2024-02-01'), dailyGoalMl: 2500, updatedAt: 7 },
      { effectiveFrom: d('2024-02-01'), dailyGoalMl: 3500, updatedAt: 7 },
      { effectiveFrom: d('2024-02-01'), dailyGoalMl: 3000, updatedAt: 7 },
    ];
    for (const order of permutations(tied)) {
      expect(goalForDate(order, d('2024-02-01'))).toBe(3500);
    }
  });

  it('ignores deleted goals', () => {
    const history: GoalHistoryEntry[] = [
      { effectiveFrom: d('2024-01-01'), dailyGoalMl: 2000, updatedAt: 1 },
      {
        effectiveFrom: d('2024-02-01'),
        dailyGoalMl: 4000,
        updatedAt: 9,
        deletedAt: 9,
      },
      {
        effectiveFrom: d('2024-03-01'),
        dailyGoalMl: 4000,
        updatedAt: 9,
        deletedAt: new Date(9),
      },
    ];
    expect(goalForDate(history, d('2024-02-15'))).toBe(2000);
    expect(goalForDate(history, d('2024-03-15'))).toBe(2000);
    expect(goalForDate(history.slice(1, 2), d('2024-02-15'))).toBeNull();
  });
});
