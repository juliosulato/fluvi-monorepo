import { date, index, integer, pgTable, timestamp } from 'drizzle-orm/pg-core';
import { syncColumns } from '../columns.js';

export const waterLogs = pgTable(
  'water_logs',
  {
    ...syncColumns,
    amountMl: integer('amount_ml').notNull(),
    loggedAt: timestamp('logged_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    localDate: date('local_date', { mode: 'string' }).notNull(),
  },
  (table) => [
    index('water_logs_user_id_server_version_idx').on(
      table.userId,
      table.serverVersion,
    ),
  ],
);
