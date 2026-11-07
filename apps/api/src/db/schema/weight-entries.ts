import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { syncColumns } from '../columns.js';

export const weightEntries = pgTable(
  'weight_entries',
  {
    ...syncColumns,
    weightGrams: integer('weight_grams').notNull(),
    measuredAt: timestamp('measured_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('weight_entries_user_id_server_version_idx').on(
      table.userId,
      table.serverVersion,
    ),
    // One active weight per day. Deleted duplicates (tombstones) are allowed.
    uniqueIndex('weight_entries_user_id_local_date_idx')
      .on(table.userId, table.localDate)
      .where(sql`deleted_at is null`),
  ],
);
