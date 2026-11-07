import {
  ACTIVITY_LEVELS,
  isLocalDate,
  isValidSyncGoalMl,
  isValidSyncQuickAmountsMl,
  isValidSyncWaterMl,
  isValidSyncWeightGrams,
} from '@fluvi/domain';
import { z } from 'zod';
import {
  SYNC_REJECTION_REASON,
  type SyncRejectionReason,
} from './rejection-reason.js';

/**
 * Last millisecond of year 9999 (UTC). Postgres rejects the ISO string the
 * driver sends for any later instant (and `Date` cannot go much further), so
 * a larger value would fail the whole push transaction instead of one record.
 */
const MAX_TIMESTAMP_MS = 253_402_300_799_999;

/** Refine options that tag the issue with its rejection reason (`issue.params.reason`). */
const because = (reason: SyncRejectionReason) => ({ params: { reason } });

/** Milliseconds since the epoch. */
const timestampMsSchema = z.int().nonnegative().max(MAX_TIMESTAMP_MS);

/** Calendar date as `YYYY-MM-DD`. */
const localDateSchema = z
  .string()
  .refine(isLocalDate, because(SYNC_REJECTION_REASON.invalidLocalDate));

const outOfRange = because(SYNC_REJECTION_REASON.valueOutOfRange);

/** The app always generates lowercase UUIDs; Postgres would lowercase anything else on output. */
const recordIdSchema = z
  .uuid()
  .refine(
    (id) => id === id.toLowerCase(),
    because(SYNC_REJECTION_REASON.malformedRecord),
  );

/** Columns shared by every synced record that has a device-generated id. */
const syncRecordColumns = {
  id: recordIdSchema,
  createdAt: timestampMsSchema,
  updatedAt: timestampMsSchema,
  deletedAt: timestampMsSchema.nullable(),
};

export const waterLogRecordSchema = z.object({
  ...syncRecordColumns,
  amountMl: z.number().refine(isValidSyncWaterMl, outOfRange),
  loggedAt: timestampMsSchema,
  localDate: localDateSchema,
});

export type WaterLogRecord = z.infer<typeof waterLogRecordSchema>;

export const weightEntryRecordSchema = z.object({
  ...syncRecordColumns,
  weightGrams: z.number().refine(isValidSyncWeightGrams, outOfRange),
  measuredAt: timestampMsSchema,
  localDate: localDateSchema,
});

export type WeightEntryRecord = z.infer<typeof weightEntryRecordSchema>;

export const goalRecordSchema = z.object({
  ...syncRecordColumns,
  effectiveFrom: localDateSchema,
  dailyGoalMl: z.number().refine(isValidSyncGoalMl, outOfRange),
});

export type GoalRecord = z.infer<typeof goalRecordSchema>;

/**
 * One record per user, identified by the session user: no `id` and no
 * `deletedAt` (it only goes away when the account is deleted).
 *
 * `weightTrackingEnabled`, `weightConsentAt` and `weightConsentPolicyVersion`
 * are one merge group, decided by `weightConsentUpdatedAt` instead of the
 * row's `updatedAt`: turning weight tracking on or off is the same action as
 * giving or revoking consent.
 */
export const userSettingsRecordSchema = z.object({
  activityLevel: z.enum(ACTIVITY_LEVELS),
  quickAmountsMl: z
    .array(z.number())
    .refine(isValidSyncQuickAmountsMl, outOfRange),
  weightTrackingEnabled: z.boolean(),
  weightConsentAt: timestampMsSchema.nullable(),
  weightConsentPolicyVersion: z.string().min(1).nullable(),
  weightConsentUpdatedAt: timestampMsSchema.nullable(),
  createdAt: timestampMsSchema,
  updatedAt: timestampMsSchema,
});

export type UserSettingsRecord = z.infer<typeof userSettingsRecordSchema>;
