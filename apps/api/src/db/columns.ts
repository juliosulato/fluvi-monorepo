import { sql } from 'drizzle-orm';
import { bigint, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './schema/auth.js';

/** Timestamps and cursor of every synced table, including the per-user `user_settings`. */
export const syncVersionColumns = {
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  serverVersion: bigint('server_version', { mode: 'number' })
    .notNull()
    .default(sql`nextval('sync_version_seq')`),
};

/** Columns of a synced table whose records have an id generated on the device. */
export const syncColumns = {
  id: uuid('id').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  ...syncVersionColumns,
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
};
