import 'dotenv/config';
import { Kysely, Migrator, FileMigrationProvider } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createDb } from './database';

async function withDb<T>(fn: (db: Kysely<any>) => Promise<T>) {
  const db = createDb();
  try {
    return await fn(db);
  } finally {
    // @ts-ignore
    await db?.destroy?.();
  }
}

async function getMigrator(db: Kysely<any>) {
  const migrationFolder = path.join(__dirname, "migrations");
  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      // All *.ts files that export `up` and `down`
      migrationFolder,
    }),
  });
}

async function run() {
  const cmd = process.argv[2] ?? 'latest'; // latest | down | status

  await withDb(async (db) => {
    const migrator = await getMigrator(db);

    if (cmd === 'latest') {
      const { error, results } = await migrator.migrateToLatest();
      results?.forEach((r) => {
        if (r.status === 'Success') console.log(`✓ ${r.migrationName}`);
        else if (r.status === 'Error') console.error(`✗ ${r.migrationName}`);
      });
      if (error) {
        console.error(error);
        process.exit(1);
      }
      console.log('Migrations up-to-date.');
      return;
    }

    if (cmd === 'down') {
      const { error, results } = await migrator.migrateDown();
      results?.forEach((r) => {
        if (r.status === 'Success') console.log(`↩︎ reverted ${r.migrationName}`);
        else if (r.status === 'Error') console.error(`✗ ${r.migrationName}`);
      });
      if (error) {
        console.error(error);
        process.exit(1);
      }
      return;
    }

    if (cmd === 'status') {
      const status = await migrator.getMigrations();
      status.forEach((m) => {
        console.log(`${m.name} - ${m.executedAt ? 'EXECUTED' : 'PENDING'}`);
      });
      return;
    }

    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  });
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});