import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add sport_league column to league table
  await db.schema
    .alterTable('league')
    .addColumn('sport_league', 'text', (c) => c.notNull().defaultTo('NFL'))
    .execute();

  // Migrate data from league_settings to league
  // Get all leagues with their corresponding sport_league values
  const leaguesWithSettings = await db
    .selectFrom('league')
    .leftJoin('league_settings', 'league.league_id', 'league_settings.league_id')
    .select(['league.league_id', 'league_settings.sport_league'])
    .execute();

  // Update each league with the sport_league value from league_settings
  for (const league of leaguesWithSettings) {
    if (league.sport_league) {
      await db
        .updateTable('league')
        .set({ sport_league: league.sport_league })
        .where('league_id', '=', league.league_id)
        .execute();
    }
  }

  // Drop sport_league column from league_settings table
  await db.schema
    .alterTable('league_settings')
    .dropColumn('sport_league')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Add sport_league column back to league_settings table
  await db.schema
    .alterTable('league_settings')
    .addColumn('sport_league', 'text', (c) => c.notNull().defaultTo('NFL'))
    .execute();

  // Migrate data from league back to league_settings
  // Get all leagues with their sport_league values
  const leagues = await db
    .selectFrom('league')
    .leftJoin('league_settings', 'league.league_id', 'league_settings.league_id')
    .select(['league.league_id', 'league.sport_league'])
    .execute();

  // Update each league_settings with the sport_league value from league
  for (const league of leagues) {
    if (league.sport_league) {
      await db
        .updateTable('league_settings')
        .set({ sport_league: league.sport_league })
        .where('league_id', '=', league.league_id)
        .execute();
    }
  }

  // Drop sport_league column from league table
  await db.schema
    .alterTable('league')
    .dropColumn('sport_league')
    .execute();
}