import { ACTIVITY_LEVELS } from '@fluvi/domain';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { syncVersionColumns } from '../columns.js';
import { users } from './auth.js';

// One row per user, so the key is the user itself: there is no device-generated id and no
// deleted_at (the row only goes away with the account). The primary key also serves the pull,
// so there is no separate (user_id, server_version) index. activity_level is typed from the
// domain but has no CHECK or enum in the database: the values live only in @fluvi/domain.
//
// Weight consent is its own merge group: weight_tracking_enabled, weight_consent_at and
// weight_consent_policy_version are merged together by weight_consent_updated_at, apart from
// the row's last-write-wins, so a stale device never turns a revoked consent back on.
export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  activityLevel: text('activity_level', { enum: ACTIVITY_LEVELS }).notNull(),
  quickAmountsMl: integer('quick_amounts_ml').array().notNull(),
  weightTrackingEnabled: boolean('weight_tracking_enabled').notNull(),
  weightConsentAt: timestamp('weight_consent_at', {
    withTimezone: true,
    mode: 'date',
  }),
  weightConsentPolicyVersion: text('weight_consent_policy_version'),
  weightConsentUpdatedAt: timestamp('weight_consent_updated_at', {
    withTimezone: true,
    mode: 'date',
  }),
  ...syncVersionColumns,
});
