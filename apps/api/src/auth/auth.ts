import { expo } from '@better-auth/expo';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { env } from '@/config/env.js';
import { db } from '@/db/client.js';
import * as authSchema from '@/db/schema/auth.js';

const DEV_TRUSTED_ORIGINS = ['exp://', 'exp://**'];
const DAY_IN_SECONDS = 60 * 60 * 24;

export function createAuthOptions() {
  return {
    appName: 'Fluvi',
    // biome-ignore lint/style/useNamingConvention: Better Auth option name.
    baseURL: env.BETTER_AUTH_URL,
    // Includes /v1 because Nest's global prefix does not apply to the Better Auth routes.
    basePath: '/v1/auth',
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: authSchema,
      usePlural: true,
    }),
    advanced: {
      database: { generateId: 'uuid' },
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    trustedOrigins: [
      env.APP_SCHEME,
      ...(env.NODE_ENV === 'development' ? DEV_TRUSTED_ORIGINS : []),
    ],
    session: {
      expiresIn: 60 * DAY_IN_SECONDS,
      updateAge: DAY_IN_SECONDS,
    },
    account: {
      // biome-ignore lint/style/useNamingConvention: Better Auth option name.
      encryptOAuthTokens: true,
    },
    user: {
      deleteUser: { enabled: true },
    },
    plugins: [expo()],
  } satisfies BetterAuthOptions;
}

export const auth = betterAuth(createAuthOptions());
