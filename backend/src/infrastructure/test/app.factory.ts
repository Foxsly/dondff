import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { SleeperModule } from '@/sleeper/sleeper.module';
import { Kysely, SqliteDialect, CamelCasePlugin } from 'kysely';
import Database from 'better-sqlite3';
import type { DB } from '@/infrastructure/database/types';
import { DB_PROVIDER } from '@/infrastructure/database/database.module';
import { migrateToLatest, resetAllTables } from './db';

export async function createTestApp(rootModule: any = AppModule): Promise<INestApplication> {
  // In-memory SQLite for fast, isolated E2E
  const sqlite = new Database(':memory:');
  const db = new Kysely<DB>({
    dialect: new SqliteDialect({ database: sqlite }),
    plugins: [new CamelCasePlugin()],
  });

  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [rootModule],
  })
    .overrideProvider(DB_PROVIDER)
    .useValue(db)
    .compile();

  const app = moduleRef.createNestApplication({ logger: ['error', 'warn', 'log'] });

  // Only run DB migrations when the root module is the full AppModule
  if (rootModule === AppModule) {
    await migrateToLatest(db);
  }
  await app.init();

  // handy hooks for specs
  (app as any).__db__ = db;
  (app as any).__reset__ = async () => resetAllTables(db);

  return app;
}

export async function closeTestApp(app: INestApplication) {
  const db: Kysely<DB> | undefined = (app as any).__db__;
  await app.close();
  await db?.destroy?.();
}
