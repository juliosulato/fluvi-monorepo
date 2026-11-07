import { describe, expect, it } from 'vitest';
import {
  goalRecordSchema,
  userSettingsRecordSchema,
  waterLogRecordSchema,
  weightEntryRecordSchema,
} from './records.js';
import { SYNC_REJECTION_REASON } from './rejection-reason.js';

const ID = '019a5f3e-8b2c-7d4e-9f10-1a2b3c4d5e6f';
const NOW = 1_762_450_000_000;
const columns = { id: ID, createdAt: NOW, updatedAt: NOW, deletedAt: null };

const waterLog = {
  ...columns,
  amountMl: 250,
  loggedAt: NOW,
  localDate: '2026-11-06',
};
const weightEntry = {
  ...columns,
  weightGrams: 70_500,
  measuredAt: NOW,
  localDate: '2026-11-06',
};
const goal = { ...columns, effectiveFrom: '2026-11-06', dailyGoalMl: 2950 };
const userSettings = {
  activityLevel: 'moderate',
  quickAmountsMl: [150, 250, 500],
  weightTrackingEnabled: true,
  weightConsentAt: NOW,
  weightConsentPolicyVersion: '2026-11-01',
  weightConsentUpdatedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

describe('sync record schemas', () => {
  it('accepts valid records', () => {
    expect(waterLogRecordSchema.parse(waterLog)).toEqual(waterLog);
    expect(weightEntryRecordSchema.parse(weightEntry)).toEqual(weightEntry);
    expect(goalRecordSchema.parse(goal)).toEqual(goal);
    expect(userSettingsRecordSchema.parse(userSettings)).toEqual(userSettings);
  });

  it('accepts the last millisecond of year 9999', () => {
    const record = { ...waterLog, loggedAt: 253_402_300_799_999 };
    expect(waterLogRecordSchema.parse(record)).toEqual(record);
  });

  it('accepts a tombstone', () => {
    const tombstone = { ...waterLog, deletedAt: NOW };
    expect(waterLogRecordSchema.parse(tombstone)).toEqual(tombstone);
  });

  it('drops unknown fields', () => {
    expect(
      waterLogRecordSchema.parse({ ...waterLog, userId: ID, serverVersion: 9 }),
    ).toEqual(waterLog);
  });

  it.each([
    [
      'water above the sync limit',
      waterLogRecordSchema,
      { ...waterLog, amountMl: 5001 },
    ],
    ['water of 0 ml', waterLogRecordSchema, { ...waterLog, amountMl: 0 }],
    [
      'weight below the limit',
      weightEntryRecordSchema,
      { ...weightEntry, weightGrams: 19_999 },
    ],
    [
      'goal above the sync limit',
      goalRecordSchema,
      { ...goal, dailyGoalMl: 10_001 },
    ],
    [
      'invalid localDate',
      waterLogRecordSchema,
      { ...waterLog, localDate: '2026-02-30' },
    ],
    [
      'invalid effectiveFrom',
      goalRecordSchema,
      { ...goal, effectiveFrom: '06/11/2026' },
    ],
    [
      'timestamp as ISO string',
      waterLogRecordSchema,
      { ...waterLog, updatedAt: '2026-11-06T10:00:00Z' },
    ],
    [
      'timestamp after year 9999',
      waterLogRecordSchema,
      { ...waterLog, loggedAt: 253_402_300_800_000 },
    ],
    ['id that is not a UUID', waterLogRecordSchema, { ...waterLog, id: 'abc' }],
    [
      'two quick amounts',
      userSettingsRecordSchema,
      { ...userSettings, quickAmountsMl: [150, 250] },
    ],
    [
      'quick amount out of range',
      userSettingsRecordSchema,
      { ...userSettings, quickAmountsMl: [150, 250, 5001] },
    ],
    [
      'unknown activity level',
      userSettingsRecordSchema,
      { ...userSettings, activityLevel: 'low' },
    ],
  ])('rejects %s', (_name, schema, record) => {
    expect(schema.safeParse(record).success).toBe(false);
  });
});

describe('rejection reasons', () => {
  const reasonOf = (result: {
    success: boolean;
    error?: { issues: { code: string; params?: Record<string, unknown> }[] };
  }) => {
    const issue = result.error?.issues[0];
    return issue?.code === 'custom' && typeof issue.params?.reason === 'string'
      ? issue.params.reason
      : SYNC_REJECTION_REASON.malformedRecord;
  };

  it.each([
    [
      'water out of range',
      waterLogRecordSchema,
      { ...waterLog, amountMl: 5001 },
      SYNC_REJECTION_REASON.valueOutOfRange,
    ],
    [
      'weight out of range',
      weightEntryRecordSchema,
      { ...weightEntry, weightGrams: 1 },
      SYNC_REJECTION_REASON.valueOutOfRange,
    ],
    [
      'goal out of range',
      goalRecordSchema,
      { ...goal, dailyGoalMl: 100 },
      SYNC_REJECTION_REASON.valueOutOfRange,
    ],
    [
      'quick amounts out of range',
      userSettingsRecordSchema,
      { ...userSettings, quickAmountsMl: [1, 2] },
      SYNC_REJECTION_REASON.valueOutOfRange,
    ],
    [
      'invalid localDate',
      waterLogRecordSchema,
      { ...waterLog, localDate: '2026-02-30' },
      SYNC_REJECTION_REASON.invalidLocalDate,
    ],
    [
      'invalid effectiveFrom',
      goalRecordSchema,
      { ...goal, effectiveFrom: 'x' },
      SYNC_REJECTION_REASON.invalidLocalDate,
    ],
    [
      'uppercase UUID',
      waterLogRecordSchema,
      { ...waterLog, id: ID.toUpperCase() },
      SYNC_REJECTION_REASON.malformedRecord,
    ],
    [
      'missing field',
      waterLogRecordSchema,
      { ...waterLog, amountMl: undefined },
      SYNC_REJECTION_REASON.malformedRecord,
    ],
    [
      'wrong type',
      waterLogRecordSchema,
      { ...waterLog, amountMl: '250' },
      SYNC_REJECTION_REASON.malformedRecord,
    ],
  ])('%s → %s', (_name, schema, record, reason) => {
    const result = schema.safeParse(record);
    expect(result.success).toBe(false);
    expect(reasonOf(result)).toBe(reason);
  });
});
