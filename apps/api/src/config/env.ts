import { existsSync } from 'node:fs';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  APP_SCHEME: z
    .string()
    .regex(/^[a-z][a-z0-9+.-]*:\/\/$/, 'must look like "fluvi://"'),
});

export type Env = z.infer<typeof envSchema>;

// Only local development reads .env (the dev and db:* scripts set NODE_ENV). Tests get
// their variables from .env.test through Vitest, and deployments from the environment.
if (process.env.NODE_ENV === 'development' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env: Env = parsed.data;
