import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';

export async function setup(project: TestProject) {
  // The e2e suite creates and deletes users, so it must never touch the dev database.
  // vitest.config.e2e.ts reads only .env.test and refuses to start unless DATABASE_URL is
  // fluvi_test on port 5433. globalSetup runs in Vitest's main process, where that env is not
  // in process.env, so the URL comes from the resolved config.
  const url = project.config.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL missing from the e2e config.');
  }
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: './src/db/migrations' });
  } finally {
    await client.end();
  }
}
