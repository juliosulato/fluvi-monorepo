import { describe, expect, it } from 'vitest';
import {
  addDays,
  isLocalDate,
  localDateFromDate,
  parseLocalDate,
} from './local-date.js';

describe('isLocalDate', () => {
  it.each([
    ['2024-01-01', true],
    ['2024-02-29', true],
    ['2023-02-29', false],
    ['2024-13-01', false],
    ['2024-04-31', false],
    ['2024-1-01', false],
    ['20240101', false],
    ['0099-01-01', false],
    ['', false],
  ])('%s → %s', (value, expected) => {
    expect(isLocalDate(value)).toBe(expected);
  });
});

describe('parseLocalDate', () => {
  it('throws on invalid dates', () => {
    expect(() => parseLocalDate('2023-02-29')).toThrow(RangeError);
  });
});

describe('addDays', () => {
  it.each([
    ['2024-12-31', 1, '2025-01-01'],
    ['2025-01-01', -1, '2024-12-31'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-02-29', 1, '2024-03-01'],
    ['2023-02-28', 1, '2023-03-01'],
    ['2024-03-01', -1, '2024-02-29'],
    // Around Brazilian and US DST changes, which UTC math must ignore.
    ['2024-03-09', 2, '2024-03-11'],
    ['2018-11-03', 2, '2018-11-05'],
    ['2024-01-31', 30, '2024-03-01'],
    ['2024-05-10', 0, '2024-05-10'],
  ])('%s + %i = %s', (date, days, expected) => {
    expect(addDays(parseLocalDate(date), days)).toBe(expected);
  });
});

describe('addDays out of range', () => {
  it.each([
    ['1000-01-01', -1],
    ['9999-12-31', 1],
  ])('%s + %i throws', (date, days) => {
    expect(() => addDays(parseLocalDate(date), days)).toThrow(RangeError);
  });
});

describe('localDateFromDate', () => {
  it('throws on an invalid Date', () => {
    expect(() => localDateFromDate(new Date('x'))).toThrow(RangeError);
  });

  // `bun run test` pins TZ=America/Sao_Paulo. On 2018-11-04 Brazil started DST
  // at midnight, so 00:00 did not exist and the clock jumped to 01:00. On
  // 2019-02-17 DST ended: at midnight the clock went back to 23:00 on the 16th.
  // In other time zones these assertions still hold, but test nothing special.
  it('keeps the calendar date across a DST midnight gap', () => {
    expect(localDateFromDate(new Date(2018, 10, 3, 23, 59))).toBe('2018-11-03');
    expect(localDateFromDate(new Date(2018, 10, 4, 0, 30))).toBe('2018-11-04');
    expect(localDateFromDate(new Date(2019, 1, 16, 23, 30))).toBe('2019-02-16');
  });

  it('uses the local calendar date', () => {
    expect(localDateFromDate(new Date(2024, 0, 5, 23, 59))).toBe('2024-01-05');
    expect(localDateFromDate(new Date(2024, 11, 31, 0, 0))).toBe('2024-12-31');
  });
});
