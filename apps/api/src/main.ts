import 'reflect-metadata';
import { env } from '@/config/env.js';
import { createApp } from './create-app.js';

async function bootstrap() {
  const app = await createApp();
  await app.listen(env.PORT);
}
await bootstrap();
