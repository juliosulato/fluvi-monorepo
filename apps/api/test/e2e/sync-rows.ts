import { randomUUID } from 'node:crypto';
import { db } from '@/db/client.js';
import { goals } from '@/db/schema/goals.js';
import { userSettings } from '@/db/schema/user-settings.js';
import { waterLogs } from '@/db/schema/water-logs.js';
import { weightEntries } from '@/db/schema/weight-entries.js';

const NOW = new Date('2026-11-06T12:00:00Z');

type Overrides = { localDate?: string; deletedAt?: Date | null };

/** Inserts rows the way the push will: id from the device, timestamps from the record. */
export const insertSyncRow = {
  waterLog: (userId: string) =>
    db.insert(waterLogs).values({
      id: randomUUID(),
      userId,
      createdAt: NOW,
      updatedAt: NOW,
      amountMl: 250,
      loggedAt: NOW,
      localDate: '2026-11-06',
    }),
  weightEntry: (userId: string, overrides: Overrides = {}) =>
    db.insert(weightEntries).values({
      id: randomUUID(),
      userId,
      createdAt: NOW,
      updatedAt: NOW,
      weightGrams: 70_500,
      measuredAt: NOW,
      localDate: '2026-11-06',
      ...overrides,
    }),
  goal: (userId: string, overrides: Overrides = {}) =>
    db.insert(goals).values({
      id: randomUUID(),
      userId,
      createdAt: NOW,
      updatedAt: NOW,
      dailyGoalMl: 2950,
      effectiveFrom: overrides.localDate ?? '2026-11-06',
      deletedAt: overrides.deletedAt,
    }),
  userSettings: (userId: string) =>
    db.insert(userSettings).values({
      userId,
      activityLevel: 'moderate',
      quickAmountsMl: [150, 250, 500],
      weightTrackingEnabled: true,
      weightConsentAt: NOW,
      weightConsentPolicyVersion: '2026-11-01',
      weightConsentUpdatedAt: NOW,
      createdAt: NOW,
      updatedAt: NOW,
    }),
};
