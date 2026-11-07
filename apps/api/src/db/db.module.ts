import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { db, sqlClient } from '@/db/client.js';
import { DB } from '@/db/inject-db.js';

@Global()
@Module({
  providers: [{ provide: DB, useValue: db }],
  exports: [DB],
})
export class DbModule implements OnApplicationShutdown {
  // DbModule is the only owner of the client's shutdown. The same client (src/db/client.ts)
  // also backs the Better Auth instance, so nothing else may call sqlClient.end().
  async onApplicationShutdown() {
    await sqlClient.end({ timeout: 5 });
  }
}
