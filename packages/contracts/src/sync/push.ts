import { z } from 'zod';
import type {
  GoalRecord,
  UserSettingsRecord,
  WaterLogRecord,
  WeightEntryRecord,
} from './records.js';
import type { SyncRejectionReason } from './rejection-reason.js';

/** Maximum records in one push, adding up every entity (`userSettings` counts as 1). */
export const MAX_PUSH_RECORDS = 500;

/**
 * Envelope of a push. Each item only needs a valid `id` here, so the result
 * can point at it; the full record is validated one by one against the record
 * schemas in `records.ts`, and an invalid one comes back as `rejected`
 * instead of failing the whole batch.
 */
const pushItemSchema = z.looseObject({ id: z.uuid() });

export const syncPushBodySchema = z
  .object({
    waterLogs: z.array(pushItemSchema).default([]),
    weightEntries: z.array(pushItemSchema).default([]),
    goals: z.array(pushItemSchema).default([]),
    userSettings: z.looseObject({}).optional(),
  })
  .refine(
    (body) =>
      body.waterLogs.length +
        body.weightEntries.length +
        body.goals.length +
        (body.userSettings === undefined ? 0 : 1) <=
      MAX_PUSH_RECORDS,
    { message: `A push carries at most ${MAX_PUSH_RECORDS} records` },
  );

/**
 * What the app sends. The schema above only checks the envelope, so this type
 * is spelled out from the record types: a change to a record breaks the
 * app's typecheck, like the rest of the contract.
 */
export interface SyncPushBody {
  waterLogs?: WaterLogRecord[];
  weightEntries?: WeightEntryRecord[];
  goals?: GoalRecord[];
  userSettings?: UserSettingsRecord;
}

export const SYNC_PUSH_STATUS = {
  /** Written: inserted, or won last-write-wins. */
  applied: 'applied',
  /** Valid but not written (lost last-write-wins or resolved as a duplicate). The server version comes back in the pull. */
  ignored: 'ignored',
  /** Invalid; `reason` says why. */
  rejected: 'rejected',
} as const;

export type SyncPushStatus =
  (typeof SYNC_PUSH_STATUS)[keyof typeof SYNC_PUSH_STATUS];

/**
 * `status` and `reason` are parsed as plain strings, and typed as open unions,
 * so an app already installed neither fails nor assumes exhaustiveness when a
 * status or reason is added later.
 */
const pushStatusSchema = z.custom<SyncPushStatus | (string & {})>(
  (value) => typeof value === 'string',
);
const rejectionReasonSchema = z.custom<SyncRejectionReason | (string & {})>(
  (value) => typeof value === 'string',
);

export const syncPushSettingsResultSchema = z.object({
  status: pushStatusSchema,
  reason: rejectionReasonSchema.optional(),
});

export type SyncPushSettingsResult = z.infer<
  typeof syncPushSettingsResultSchema
>;

export const syncPushResultSchema = syncPushSettingsResultSchema.extend({
  id: z.uuid(),
});

export type SyncPushResult = z.infer<typeof syncPushResultSchema>;

/**
 * One result per record sent, grouped like the body. There is no cursor: the
 * app pulls next from the cursor it already had.
 */
export const syncPushResponseSchema = z.object({
  waterLogs: z.array(syncPushResultSchema),
  weightEntries: z.array(syncPushResultSchema),
  goals: z.array(syncPushResultSchema),
  userSettings: syncPushSettingsResultSchema.nullable(),
});

export type SyncPushResponse = z.infer<typeof syncPushResponseSchema>;
