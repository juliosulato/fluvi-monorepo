import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  MAX_PUSH_RECORDS,
  type SyncPushBody,
  syncPushBodySchema,
} from './push.js';

const item = (index: number) => ({
  id: `019a5f3e-8b2c-7d4e-9f10-${index.toString(16).padStart(12, '0')}`,
  amountMl: 250,
});

describe('syncPushBodySchema', () => {
  it('defaults missing entities to empty arrays', () => {
    expect(syncPushBodySchema.parse({})).toEqual({
      waterLogs: [],
      weightEntries: [],
      goals: [],
    });
  });

  it('takes a SyncPushBody as input', () => {
    // Compile-time check: the app's body type must fit the envelope schema.
    const body: SyncPushBody = {};
    const input: z.input<typeof syncPushBodySchema> = body;
    expect(syncPushBodySchema.safeParse(input).success).toBe(true);
  });

  it('keeps record fields for per-record validation', () => {
    const body = syncPushBodySchema.parse({ waterLogs: [item(1)] });
    expect(body.waterLogs).toEqual([item(1)]);
  });

  it('rejects an item without a valid id', () => {
    expect(
      syncPushBodySchema.safeParse({ goals: [{ id: 'abc' }] }).success,
    ).toBe(false);
  });

  it('accepts exactly MAX_PUSH_RECORDS records across entities', () => {
    const waterLogs = Array.from({ length: MAX_PUSH_RECORDS - 2 }, (_, i) =>
      item(i),
    );
    const body = { waterLogs, goals: [item(9999)], userSettings: {} };
    expect(syncPushBodySchema.safeParse(body).success).toBe(true);
  });

  it('rejects a batch above MAX_PUSH_RECORDS across entities', () => {
    const waterLogs = Array.from({ length: MAX_PUSH_RECORDS }, (_, i) =>
      item(i),
    );
    const body = { waterLogs, userSettings: {} };
    expect(syncPushBodySchema.safeParse(body).success).toBe(false);
  });
});
