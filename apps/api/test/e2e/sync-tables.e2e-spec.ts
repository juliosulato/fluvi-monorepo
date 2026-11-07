import { sqlClient } from '@/db/client.js';
import { insertSyncRow } from './sync-rows.js';
import { testAuth } from './test-auth.js';

const UNIQUE_VIOLATION = '23505';
const DELETED_AT = new Date('2026-11-06T13:00:00Z');

async function createUser() {
  const { test } = await testAuth.$context;
  return test.saveUser(test.createUser());
}

describe('sync tables (e2e)', () => {
  afterAll(async () => {
    await sqlClient.end();
  });

  describe.each([
    ['weight_entries', insertSyncRow.weightEntry],
    ['goals', insertSyncRow.goal],
  ])('%s: one active record per day', (_table, insert) => {
    it('rejects a second active record on the same day', async () => {
      const user = await createUser();
      await insert(user.id);

      await expect(insert(user.id)).rejects.toMatchObject({
        cause: { code: UNIQUE_VIOLATION },
      });
    });

    it('accepts an active record next to a deleted one on the same day', async () => {
      const user = await createUser();
      await insert(user.id, { deletedAt: DELETED_AT });
      await insert(user.id, { deletedAt: DELETED_AT });

      await expect(insert(user.id)).resolves.toBeDefined();
    });

    it('accepts active records on different days and for different users', async () => {
      const user = await createUser();
      const other = await createUser();
      await insert(user.id);

      await expect(
        insert(user.id, { localDate: '2026-11-07' }),
      ).resolves.toBeDefined();
      await expect(insert(other.id)).resolves.toBeDefined();
    });
  });
});
