import { FileMigrationProvider, Kysely, Migrator, sql } from 'kysely';
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
  // Truncate handles FK order + identity reset + cascades
  await sql`
    TRUNCATE TABLE
      "league_user",
      "team_player",
      "team",
      "event",
      "event_group",
      "league",
      "dond_user",
      "team_entry",
      "team_entry_audit",
      "team_entry_offer",
      "team_entry_event",
      "league_settings",
      "league_settings_position"
    RESTART IDENTITY
    CASCADE
  `
    .execute(db)
    .catch(() => {});
}
