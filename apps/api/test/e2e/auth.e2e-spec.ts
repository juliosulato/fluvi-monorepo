import type { INestApplication } from '@nestjs/common';
import { eq, getTableName } from 'drizzle-orm';
import request from 'supertest';
import { createApp } from '@/create-app.js';
import { db, sqlClient } from '@/db/client.js';
import { users } from '@/db/schema/auth.js';
import { goals } from '@/db/schema/goals.js';
import { userSettings } from '@/db/schema/user-settings.js';
import { waterLogs } from '@/db/schema/water-logs.js';
import { weightEntries } from '@/db/schema/weight-entries.js';
import { insertSyncRow } from './sync-rows.js';
import { testAuth } from './test-auth.js';

const APP_ORIGIN = 'fluvi://';

async function createSignedInUser(deviceCount: number) {
  const { test } = await testAuth.$context;
  const user = await test.saveUser(test.createUser());
  const devices: string[] = [];
  for (let i = 0; i < deviceCount; i++) {
    const { headers } = await test.login({ userId: user.id });
    const cookie = headers.get('cookie');
    // An empty cookie would make every 401 assertion pass for the wrong reason.
    if (!cookie) {
      throw new Error('testUtils login returned no session cookie');
    }
    devices.push(cookie);
  }
  return { user, devices };
}

/**
 * Counts the user's rows in every table with a foreign key to users.id. New domain tables are
 * covered automatically, so the deletion test proves ON DELETE CASCADE left nothing behind.
 */
async function countRowsReferencingUser(userId: string) {
  const references = await sqlClient<
    { tableName: string; columnName: string }[]
  >`
    select rel.relname as "tableName", att.attname as "columnName"
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.contype = 'f' and con.confrelid = 'public.users'::regclass
  `;
  const counts: Record<string, number> = {};
  for (const { tableName, columnName } of references) {
    const [row] = await sqlClient<{ count: number }[]>`
      select count(*)::int as count from ${sqlClient(tableName)}
      where ${sqlClient(columnName)} = ${userId}
    `;
    counts[tableName] = row?.count ?? 0;
  }
  return counts;
}

describe('auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health is public', async () => {
    await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200, { status: 'ok' });
  });

  it('GET /v1/me without a session returns 401', async () => {
    await request(app.getHttpServer()).get('/v1/me').expect(401);
  });

  it('GET /v1/me returns the session user', async () => {
    const { user, devices } = await createSignedInUser(1);

    const response = await request(app.getHttpServer())
      .get('/v1/me')
      .set('cookie', devices[0] ?? '')
      .expect(200);

    expect(response.body).toEqual({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
    });
  });

  it('POST /v1/auth/delete-user removes the user and every row that references it', async () => {
    const { user, devices } = await createSignedInUser(2);
    const [phone, tablet] = devices;
    const { internalAdapter } = await testAuth.$context;
    await internalAdapter.createAccount({
      userId: user.id,
      providerId: 'google',
      accountId: `google-sub-${user.id}`,
    });
    await insertSyncRow.waterLog(user.id);
    await insertSyncRow.weightEntry(user.id);
    await insertSyncRow.goal(user.id);
    await insertSyncRow.userSettings(user.id);

    const before = await countRowsReferencingUser(user.id);
    expect(before).toEqual({
      sessions: 2,
      accounts: 1,
      [getTableName(waterLogs)]: 1,
      [getTableName(weightEntries)]: 1,
      [getTableName(goals)]: 1,
      [getTableName(userSettings)]: 1,
    });

    await request(app.getHttpServer())
      .post('/v1/auth/delete-user')
      .set('cookie', phone ?? '')
      .set('origin', APP_ORIGIN)
      .send({})
      .expect(200);

    expect(
      await db.select().from(users).where(eq(users.id, user.id)),
    ).toHaveLength(0);
    const after = await countRowsReferencingUser(user.id);
    expect(Object.values(after).every((count) => count === 0)).toBe(true);
    expect(Object.keys(after).sort()).toEqual(Object.keys(before).sort());

    await request(app.getHttpServer())
      .get('/v1/me')
      .set('cookie', tablet ?? '')
      .expect(401);
  });
});
