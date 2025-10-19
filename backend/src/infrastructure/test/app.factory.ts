import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '@/app.module';
import { CamelCasePlugin, Kysely, ParseJSONResultsPlugin, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import type { DB } from '@/infrastructure/database/types';
import { DB_PROVIDER } from '@/infrastructure/database/database.module';
import { migrateToLatest, resetAllTables } from './db';

export async function createTestApp(rootModule: any = AppModule): Promise<INestApplication> {
  // In-memory SQLite for fast, isolated E2E
  const sqlite = new Database(':memory:');
  const db = new Kysely<DB>({
    dialect: new SqliteDialect({ database: sqlite }),
    plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
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
  await app.listen(0, '127.0.0.1');

  // handy hooks for specs
  (app as any).__baseUrl__ = await app.getUrl();
  (app as any).__db__ = db;
  (app as any).__reset__ = async () => resetAllTables(db);

  return app;
}

export async function closeTestApp(app: INestApplication) {
  const db: Kysely<DB> | undefined = (app as any).__db__;
  await app.close();
  await db?.destroy?.();
}

export function getBaseUrl(app: INestApplication) {
  return (app as any).__baseUrl__ as string;
}
