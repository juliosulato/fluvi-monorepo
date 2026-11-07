import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgTable,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { syncColumns } from '../columns.js';

export const goals = pgTable(
  'goals',
  {
    ...syncColumns,
    effectiveFrom: date('effective_from', { mode: 'string' }).notNull(),
    dailyGoalMl: integer('daily_goal_ml').notNull(),
  },
  (table) => [
    index('goals_user_id_server_version_idx').on(
      table.userId,
      table.serverVersion,
    ),
    // One active goal per day. Deleted duplicates (tombstones) are allowed.
    uniqueIndex('goals_user_id_effective_from_idx')
      .on(table.userId, table.effectiveFrom)
      .where(sql`deleted_at is null`),
  ],
);
