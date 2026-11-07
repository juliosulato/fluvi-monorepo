import { describe, expect, it } from 'vitest';
import {
  MAX_PULL_LIMIT,
  syncPullQuerySchema,
  syncPullResponseSchema,
} from './pull.js';

describe('syncPullQuerySchema', () => {
  it('defaults since to 0 and limit to MAX_PULL_LIMIT', () => {
    expect(syncPullQuerySchema.parse({})).toEqual({
      since: 0,
      limit: MAX_PULL_LIMIT,
    });
  });

  it('coerces query string values', () => {
    expect(syncPullQuerySchema.parse({ since: '42', limit: '10' })).toEqual({
      since: 42,
      limit: 10,
    });
  });

  it('rejects a limit above MAX_PULL_LIMIT', () => {
    expect(
      syncPullQuerySchema.safeParse({ limit: String(MAX_PULL_LIMIT + 1) })
        .success,
    ).toBe(false);
  });
});

describe('syncPullQuerySchema: present but invalid', () => {
  it.each([
    ['empty since', { since: '' }],
    ['non-numeric since', { since: 'abc' }],
    ['negative since', { since: '-1' }],
    ['decimal since', { since: '1.5' }],
    ['empty limit', { limit: '' }],
    ['zero limit', { limit: '0' }],
  ])('rejects %s', (_name, query) => {
    expect(syncPullQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('syncPullResponseSchema', () => {
  const Now = 1_762_450_000_000;
  const columns = { id: 'a', createdAt: Now, updatedAt: Now, deletedAt: null };

  it('tolerates values outside the current ranges and enums', () => {
    const response = {
      waterLogs: [
        {
          ...columns,
          amountMl: 99_999,
          loggedAt: Now,
          localDate: '2026-11-06',
        },
      ],
      weightEntries: [],
      goals: [{ ...columns, effectiveFrom: '2026-11-06', dailyGoalMl: 1 }],
      userSettings: {
        activityLevel: 'extreme',
        quickAmountsMl: [100, 200, 300, 400],
        weightTrackingEnabled: false,
        weightConsentAt: null,
        weightConsentPolicyVersion: null,
        weightConsentUpdatedAt: null,
        createdAt: Now,
        updatedAt: Now,
      },
      nextCursor: 42,
      hasMore: false,
    };
    expect(syncPullResponseSchema.parse(response)).toEqual(response);
  });

  it('still checks structure and types', () => {
    expect(
      syncPullResponseSchema.safeParse({
        waterLogs: [
          {
            ...columns,
            amountMl: '250',
            loggedAt: Now,
            localDate: '2026-11-06',
          },
        ],
        weightEntries: [],
        goals: [],
        userSettings: null,
        nextCursor: 0,
        hasMore: false,
      }).success,
    ).toBe(false);
  });
});
