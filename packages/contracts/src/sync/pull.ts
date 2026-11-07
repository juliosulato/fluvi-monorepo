import type { ActivityLevel } from '@fluvi/domain';
import { z } from 'zod';

/** Default and maximum `limit` of a pull, per entity. */
export const MAX_PULL_LIMIT = 500;

/**
 * A non-negative integer from the query string. A missing parameter takes the
 * default; a present but empty or non-numeric one fails (400), so a client bug
 * that drops the cursor never turns into a silent full resync.
 */
const queryIntSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.int().nonnegative());

/** `GET /v1/sync/pull?since=<cursor>&limit=<n>`. `since` is 0 on the first sync. */
export const syncPullQuerySchema = z.object({
  since: queryIntSchema.optional().default(0),
  limit: queryIntSchema
    .pipe(z.int().min(1).max(MAX_PULL_LIMIT))
    .optional()
    .default(MAX_PULL_LIMIT),
});

/** What the app passes; it serializes the numbers into the query string. */
export type SyncPullQuery = Partial<z.output<typeof syncPullQuerySchema>>;

/*
 * Pull records are parsed leniently: structure and types only, no ranges,
 * closed enums or formats. Limits and enums can widen in later releases, and
 * an app already installed must keep syncing; it tolerates unknown values.
 */
const pulledColumns = {
  id: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  deletedAt: z.number().nullable(),
};

export const pulledWaterLogSchema = z.object({
  ...pulledColumns,
  amountMl: z.number(),
  loggedAt: z.number(),
  localDate: z.string(),
});

export type PulledWaterLog = z.infer<typeof pulledWaterLogSchema>;

export const pulledWeightEntrySchema = z.object({
  ...pulledColumns,
  weightGrams: z.number(),
  measuredAt: z.number(),
  localDate: z.string(),
});

export type PulledWeightEntry = z.infer<typeof pulledWeightEntrySchema>;

export const pulledGoalSchema = z.object({
  ...pulledColumns,
  effectiveFrom: z.string(),
  dailyGoalMl: z.number(),
});

export type PulledGoal = z.infer<typeof pulledGoalSchema>;

export const pulledUserSettingsSchema = z.object({
  activityLevel: z.custom<ActivityLevel | (string & {})>(
    (value) => typeof value === 'string',
  ),
  quickAmountsMl: z.array(z.number()),
  weightTrackingEnabled: z.boolean(),
  weightConsentAt: z.number().nullable(),
  weightConsentPolicyVersion: z.string().nullable(),
  weightConsentUpdatedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export type PulledUserSettings = z.infer<typeof pulledUserSettingsSchema>;

export const syncPullResponseSchema = z.object({
  waterLogs: z.array(pulledWaterLogSchema),
  weightEntries: z.array(pulledWeightEntrySchema),
  goals: z.array(pulledGoalSchema),
  userSettings: pulledUserSettingsSchema.nullable(),
  nextCursor: z.number(),
  hasMore: z.boolean(),
});

export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
