import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

const ENV_TEST_FILE = '.env.test';
const TEST_DATABASE_PORT = '5433';
const TEST_DATABASE_NAME = 'fluvi_test';

function loadTestEnv(): Record<string, string> {
  if (!existsSync(ENV_TEST_FILE)) {
    throw new Error(
      `${ENV_TEST_FILE} not found. Copy .env.test.example to ${ENV_TEST_FILE}.`,
    );
  }
  const testEnv = parseEnv(readFileSync(ENV_TEST_FILE, 'utf8')) as Record<
    string,
    string
  >;
  const url = URL.parse(testEnv.DATABASE_URL ?? '');
  if (
    url?.port !== TEST_DATABASE_PORT ||
    url.pathname !== `/${TEST_DATABASE_NAME}`
  ) {
    throw new Error(
      `DATABASE_URL in ${ENV_TEST_FILE} must point to the ${TEST_DATABASE_NAME} database on port ${TEST_DATABASE_PORT}.`,
    );
  }
  return testEnv;
}

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    passWithNoTests: true,
    env: loadTestEnv(),
    globalSetup: ['./test/e2e/global-setup.ts'],
    fileParallelism: false,
  },
});
