import { betterAuth } from 'better-auth';
import { testUtils } from 'better-auth/plugins';
import { createAuthOptions } from '@/auth/auth.js';

const appOptions = createAuthOptions();

// testUtils exposes privileged helpers (create users, open sessions), so it never goes into
// the app's auth config. This test-only instance shares the app's database, secret and
// plugins, so the sessions it creates are accepted by the real auth guard.
export const testAuth = betterAuth({
  ...appOptions,
  plugins: [...appOptions.plugins, testUtils()],
});
