import { FileMigrationProvider, Kysely, Migrator } from 'kysely';
import { promises as fs } from 'fs';
import * as path from 'path';

export async function migrateToLatest(db: Kysely<any>) {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(process.cwd(), 'src/infrastructure/database/migrations'),
    }),
  });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
}

export async function resetAllTables(db: Kysely<any>) {
  // truncate tables between tests (order matters for FKs)
  await db
    .deleteFrom('league_user')
    .execute()
    .catch(() => {});
  await db
    .deleteFrom('team_player')
    .execute()
    .catch(() => {});
  await db
    .deleteFrom('team')
    .execute()
    .catch(() => {});
  await db
    .deleteFrom('league')
    .execute()
    .catch(() => {});
  await db
    .deleteFrom('dond_user')
    .execute()
    .catch(() => {});
}
