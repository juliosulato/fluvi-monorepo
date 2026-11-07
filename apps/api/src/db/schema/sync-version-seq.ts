import { pgSequence } from 'drizzle-orm/pg-core';

// Lives in schema/ (not in columns.ts) because drizzle-kit only reads exports from this folder.
// Every insert and every winning update of a synced record takes a new value from it.
export const syncVersionSeq = pgSequence('sync_version_seq');
