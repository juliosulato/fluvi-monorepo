import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { LoggerModule } from 'nestjs-pino';
import { auth } from '@/auth/auth.js';
import { env } from '@/config/env.js';
import { DbModule } from '@/db/db.module.js';
import { HealthModule } from '@/modules/health/health.module.js';
import { UsersModule } from '@/modules/users/users.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.NODE_ENV === 'test' ? 'silent' : 'info',
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    DbModule,
    // Registers the Better Auth handler on /v1/auth/* and a global guard: every route
    // requires a session unless marked with @AllowAnonymous().
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: '1mb' },
        urlencoded: { extended: false, limit: '1mb' },
      },
    }),
    HealthModule,
    UsersModule,
  ],
})
export class AppModule {}
