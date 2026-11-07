import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@/config/env.js';
import * as authSchema from '@/db/schema/auth.js';

export const sqlClient = postgres(env.DATABASE_URL);

export const db = drizzle(sqlClient, { schema: authSchema });

export type Db = typeof db;
