import { existsSync } from 'node:fs';
import { defineConfig } from 'drizzle-kit';
import { z } from 'zod';

if (process.env.NODE_ENV === 'development' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const databaseUrl = z
  .url({ error: 'DATABASE_URL is missing or is not a URL' })
  .parse(process.env.DATABASE_URL);

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema',
  out: './src/db/migrations',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
