// src/infrastructure/database/database.module.ts
import { Module, OnApplicationShutdown } from '@nestjs/common';
import { Kysely } from 'kysely';
import { createDb } from './database';
import type { DB } from './types';

export const DB_PROVIDER = Symbol('DB_PROVIDER');

@Module({
  providers: [
    {
      provide: DB_PROVIDER,
      useFactory: (): Kysely<DB> => {
        return createDb();
      },
    },
    {
      provide: 'DB_SHUTDOWN_HOOK',
      useFactory: (db: Kysely<DB>) => ({
        async onApplicationShutdown() {
          // destroy pool/connection
          // @ts-ignore
          await db?.destroy?.();
        },
      }),
      inject: [DB_PROVIDER],
    },
  ],
  exports: [DB_PROVIDER],
})
export class DatabaseModule implements OnApplicationShutdown {
  // dummy to make class implement the interface, real hook is in provider above
  // noinspection JSUnusedGlobalSymbols
  onApplicationShutdown() {}
}
