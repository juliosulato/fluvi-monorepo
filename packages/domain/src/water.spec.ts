import { describe, expect, it } from 'vitest';
import { parseLocalDate as d } from './local-date.js';
import {
  dailyTotals,
  isValidSyncWaterMl,
  isValidWaterMl,
  type WaterEntry,
} from './water.js';

describe('isValidWaterMl', () => {
  it.each([
    [1, true],
    [250, true],
    [3000, true],
    [0, false],
    [-1, false],
    [3001, false],
    [250.5, false],
  ])('%d → %s', (ml, expected) => {
    expect(isValidWaterMl(ml)).toBe(expected);
  });
});

describe('isValidSyncWaterMl', () => {
  it.each([
    [1, true],
    [5000, true],
    [4000, true],
    [0, false],
    [5001, false],
    [250.5, false],
  ])('%d → %s', (ml, expected) => {
    expect(isValidSyncWaterMl(ml)).toBe(expected);
  });
});

describe('dailyTotals', () => {
  it('treats a missing deletedAt as active', () => {
    const entries: WaterEntry[] = [
      { amountMl: 250, localDate: '2024-01-01' },
      { amountMl: 250, localDate: '2024-01-01', deletedAt: undefined },
    ];
    expect(dailyTotals(entries).get('2024-01-01')).toBe(500);
  });

  it('sums per day and ignores deleted entries of any shape', () => {
    const entries: WaterEntry[] = [
      { amountMl: 250, localDate: d('2024-12-31'), deletedAt: null },
      { amountMl: 500, localDate: d('2024-12-31'), deletedAt: null },
      { amountMl: 999, localDate: d('2024-12-31'), deletedAt: 1_700_000_000 },
      { amountMl: 300, localDate: d('2025-01-01'), deletedAt: null },
      { amountMl: 999, localDate: d('2025-01-01'), deletedAt: new Date(0) },
      { amountMl: 999, localDate: d('2025-01-02'), deletedAt: '2025-01-02' },
    ];
    expect(Object.fromEntries(dailyTotals(entries))).toEqual({
      '2024-12-31': 750,
      '2025-01-01': 300,
    });
  });

  it('returns an empty map with no entries', () => {
    expect(dailyTotals([]).size).toBe(0);
  });
});
