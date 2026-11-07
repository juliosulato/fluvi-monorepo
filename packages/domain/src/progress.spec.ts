import { describe, expect, it } from 'vitest';
import type { GoalHistoryEntry } from './goal.js';
import { parseLocalDate as d } from './local-date.js';
import { currentStreak, type DailyTotals, periodStats } from './progress.js';

const totalsOf = (record: Record<string, number>): DailyTotals =>
  new Map(Object.entries(record).map(([date, ml]) => [d(date), ml]));

const goal2000: GoalHistoryEntry[] = [
  { effectiveFrom: d('2024-01-01'), dailyGoalMl: 2000, updatedAt: 0 },
];

describe('currentStreak', () => {
  it.each<[string, string, Record<string, number>, GoalHistoryEntry[], number]>(
    [
      [
        'today met',
        '2024-01-10',
        { '2024-01-08': 2000, '2024-01-09': 2500, '2024-01-10': 2000 },
        goal2000,
        3,
      ],
      [
        'today not met, yesterday met',
        '2024-01-10',
        { '2024-01-08': 2000, '2024-01-09': 2500, '2024-01-10': 500 },
        goal2000,
        2,
      ],
      [
        'today with no entries, yesterday met',
        '2024-01-10',
        { '2024-01-09': 2000 },
        goal2000,
        1,
      ],
      [
        'gap in the middle',
        '2024-01-10',
        {
          '2024-01-05': 2000,
          '2024-01-06': 2000,
          '2024-01-08': 2000,
          '2024-01-09': 2000,
          '2024-01-10': 2000,
        },
        goal2000,
        3,
      ],
      ['no entries', '2024-01-10', {}, goal2000, 0],
      ['no goal at all', '2024-01-10', { '2024-01-10': 5000 }, [], 0],
      [
        'stops at the day before the first goal',
        '2024-01-02',
        {
          '2023-12-30': 3000,
          '2023-12-31': 3000,
          '2024-01-01': 2000,
          '2024-01-02': 2000,
        },
        goal2000,
        2,
      ],
      [
        'across year end',
        '2025-01-01',
        { '2024-12-30': 2000, '2024-12-31': 2000, '2025-01-01': 2000 },
        goal2000,
        3,
      ],
      [
        'across leap day',
        '2024-03-01',
        { '2024-02-28': 2000, '2024-02-29': 2000, '2024-03-01': 2000 },
        goal2000,
        3,
      ],
      [
        'goal raised mid-streak',
        '2024-01-10',
        {
          '2024-01-07': 1500,
          '2024-01-08': 2000,
          '2024-01-09': 3000,
          '2024-01-10': 3000,
        },
        [
          ...goal2000,
          { effectiveFrom: d('2024-01-09'), dailyGoalMl: 3000, updatedAt: 0 },
        ],
        3,
      ],
    ],
  )('%s', (_label, today, totals, history, expected) => {
    expect(currentStreak(d(today), totalsOf(totals), history)).toBe(expected);
  });
});

describe('periodStats', () => {
  it('uses the goal in effect on each day when the goal changes mid-period', () => {
    const history: GoalHistoryEntry[] = [
      { effectiveFrom: d('2024-01-03'), dailyGoalMl: 3000, updatedAt: 0 },
      { effectiveFrom: d('2024-01-01'), dailyGoalMl: 2000, updatedAt: 0 },
    ];
    const stats = periodStats(
      d('2024-01-04'),
      4,
      totalsOf({
        '2024-01-01': 2000,
        '2024-01-02': 2500,
        '2024-01-03': 2500,
        '2024-01-04': 3000,
      }),
      history,
    );
    expect(stats.days).toEqual([
      { date: '2024-01-01', totalMl: 2000, dailyGoalMl: 2000, met: true },
      { date: '2024-01-02', totalMl: 2500, dailyGoalMl: 2000, met: true },
      { date: '2024-01-03', totalMl: 2500, dailyGoalMl: 3000, met: false },
      { date: '2024-01-04', totalMl: 3000, dailyGoalMl: 3000, met: true },
    ]);
    expect(stats.daysMet).toBe(3);
    expect(stats.averageMl).toBe(2500);
  });

  it('days before the first goal have no goal and are not met', () => {
    const stats = periodStats(
      d('2024-01-02'),
      3,
      totalsOf({ '2023-12-31': 4000, '2024-01-01': 2000 }),
      goal2000,
    );
    expect(stats.days).toEqual([
      { date: '2023-12-31', totalMl: 4000, dailyGoalMl: null, met: null },
      { date: '2024-01-01', totalMl: 2000, dailyGoalMl: 2000, met: true },
      { date: '2024-01-02', totalMl: 0, dailyGoalMl: 2000, met: false },
    ]);
    expect(stats.daysMet).toBe(1);
  });

  it('averages only the days that have entries', () => {
    const stats = periodStats(
      d('2024-01-07'),
      7,
      totalsOf({ '2024-01-05': 1000, '2024-01-06': 2001, '2024-01-07': 2000 }),
      goal2000,
    );
    expect(stats.days).toHaveLength(7);
    // (1000 + 2001 + 2000) / 3 = 1667 (rounded), not 5001 / 7.
    expect(stats.averageMl).toBe(1667);
    expect(stats.daysMet).toBe(2);
  });

  it('average is null when the period has no entries', () => {
    const stats = periodStats(d('2024-01-30'), 30, totalsOf({}), goal2000);
    expect(stats.days).toHaveLength(30);
    expect(stats.averageMl).toBeNull();
    expect(stats.daysMet).toBe(0);
  });

  it.each([
    ['2025-01-03', 7, '2024-12-28'],
    ['2024-03-01', 7, '2024-02-24'],
    ['2024-03-15', 30, '2024-02-15'],
    ['2023-03-15', 30, '2023-02-14'],
  ])('period ending %s with %i days starts at %s', (end, days, start) => {
    const stats = periodStats(d(end), days, totalsOf({}), goal2000);
    expect(stats.days[0]?.date).toBe(start);
    expect(stats.days[stats.days.length - 1]?.date).toBe(end);
    expect(new Set(stats.days.map((day) => day.date)).size).toBe(days);
  });

  it('includes the leap day', () => {
    const stats = periodStats(d('2024-03-01'), 3, totalsOf({}), goal2000);
    expect(stats.days.map((day) => day.date)).toEqual([
      '2024-02-28',
      '2024-02-29',
      '2024-03-01',
    ]);
  });

  it.each([0, -1, 1.5])('rejects days = %d', (days) => {
    expect(() => periodStats(d('2024-01-01'), days, totalsOf({}), [])).toThrow(
      RangeError,
    );
  });
});
