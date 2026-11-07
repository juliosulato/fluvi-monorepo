import { describe, expect, it } from 'vitest';
import { parseLocalDate as d } from './local-date.js';
import {
  hasWeightForDate,
  isValidSyncWeightGrams,
  isValidWeightGrams,
  parseWeightInput,
  type WeightEntry,
  weightChange,
} from './weight.js';

describe('isValidWeightGrams', () => {
  it.each([
    [20_000, true],
    [400_000, true],
    [70_500, true],
    [19_900, false],
    [400_100, false],
    [70_550, false],
    [70_500.5, false],
  ])('%d → %s', (grams, expected) => {
    expect(isValidWeightGrams(grams)).toBe(expected);
  });
});

describe('isValidSyncWeightGrams', () => {
  it.each([
    [20_000, true],
    [400_000, true],
    [70_550, true],
    [19_999, false],
    [400_001, false],
    [70_500.5, false],
  ])('%d → %s', (grams, expected) => {
    expect(isValidSyncWeightGrams(grams)).toBe(expected);
  });
});

describe('parseWeightInput', () => {
  it.each<[string, number | null]>([
    ['70', 70_000],
    ['70,5', 70_500],
    ['70.5', 70_500],
    [' 70,5 ', 70_500],
    ['20', 20_000],
    ['400', 400_000],
    ['400,0', 400_000],
    ['0,1', null],
    ['70,55', null],
    ['70.55', null],
    ['abc', null],
    ['', null],
    ['-70', null],
    ['19,9', null],
    ['400,1', null],
    ['70,', null],
    [',5', null],
    ['70,5kg', null],
    ['1e2', null],
  ])('%j → %s', (text, expected) => {
    expect(parseWeightInput(text)).toBe(expected);
  });
});

const entry = (
  localDate: string,
  weightGrams: number,
  deletedAt: WeightEntry['deletedAt'] = null,
  updatedAt: WeightEntry['updatedAt'] = 0,
): WeightEntry => ({ localDate, weightGrams, deletedAt, updatedAt });

describe('hasWeightForDate', () => {
  const entries = [
    entry('2024-01-01', 70_000),
    entry('2024-01-02', 70_500, 1_700_000_000),
  ];

  it.each([
    ['2024-01-01', true],
    ['2024-01-02', false],
    ['2024-01-03', false],
  ])('%s → %s', (date, expected) => {
    expect(hasWeightForDate(entries, d(date))).toBe(expected);
  });
});

describe('weightChange', () => {
  it.each<[string, WeightEntry[], number | null]>([
    ['no entries', [], null],
    ['one entry', [entry('2024-01-01', 70_000)], null],
    [
      'latest minus previous',
      [entry('2024-01-01', 70_000), entry('2024-01-05', 69_400)],
      -600,
    ],
    [
      'unsorted input, across year end',
      [
        entry('2025-01-01', 71_000),
        entry('2024-06-01', 75_000),
        entry('2024-12-31', 70_500),
      ],
      500,
    ],
    [
      'ignores deleted latest',
      [
        entry('2024-01-01', 70_000),
        entry('2024-01-02', 70_500),
        entry('2024-01-03', 99_000, new Date()),
      ],
      500,
    ],
    [
      'deleted leaves one entry',
      [entry('2024-01-01', 70_000), entry('2024-01-02', 70_500, '2024-01-02')],
      null,
    ],
    [
      'two entries on the latest day: compares with the previous day',
      [
        entry('2024-01-01', 70_000),
        entry('2024-01-05', 69_000, null, 1),
        entry('2024-01-05', 69_500, null, 2),
      ],
      -500,
    ],
    [
      'same-day duplicates resolved by updatedAt (Date or ms)',
      [
        entry('2024-01-01', 70_000, null, new Date(5)),
        entry('2024-01-01', 71_000, null, 4),
        entry('2024-01-02', 70_500),
      ],
      500,
    ],
    [
      'same-day duplicates with equal updatedAt: larger weight wins',
      [
        entry('2024-01-02', 70_500),
        entry('2024-01-01', 71_000),
        entry('2024-01-01', 70_000),
      ],
      -500,
    ],
    [
      'missing deletedAt counts as active',
      [
        { localDate: '2024-01-01', weightGrams: 70_000, updatedAt: 0 },
        { localDate: '2024-01-02', weightGrams: 70_200, updatedAt: 0 },
      ],
      200,
    ],
  ])('%s', (_label, entries, expected) => {
    expect(weightChange(entries)).toBe(expected);
    expect(weightChange([...entries].reverse())).toBe(expected);
  });
});
