import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Db } from '@/db/client.js';
import { InjectDb } from '@/db/inject-db.js';

@Injectable()
export class HealthRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async ping(): Promise<void> {
    await this.db.execute(sql`select 1`);
  }
}
