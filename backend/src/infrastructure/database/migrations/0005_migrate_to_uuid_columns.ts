import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Drop existing constraints
  await db.schema
    .alterTable('teamPlayer')
    .dropConstraint('team_player_team_id_fkey')
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .dropConstraint('league_user_league_id_fkey')
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .dropConstraint('league_user_user_id_fkey')
    .execute();

  await db.schema
    .alterTable('team')
    .dropConstraint('team_league_id_fkey')
    .execute();

  await db.schema
    .alterTable('team')
    .dropConstraint('team_user_id_fkey')
    .execute();

  await sql`
    ALTER TABLE "team"
      ALTER COLUMN "team_id" TYPE UUID USING "team_id"::uuid,
      ALTER COLUMN "league_id" TYPE UUID USING "league_id"::uuid,
      ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;
  `.execute(db);

  await sql`
    ALTER TABLE "team_player"
      ALTER COLUMN "team_id" TYPE UUID USING "team_id"::uuid;
  `.execute(db);

  await sql`
    ALTER TABLE "league"
      ALTER COLUMN "league_id" TYPE UUID USING "league_id"::uuid;
  `.execute(db);

  await sql`
    ALTER TABLE "league_user"
      ALTER COLUMN "league_id" TYPE UUID USING "league_id"::uuid,
      ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;
  `.execute(db);

  await sql`
    ALTER TABLE "dond_user"
      ALTER COLUMN "user_id" TYPE UUID USING "user_id"::uuid;
  `.execute(db);

  await db.schema
    .alterTable('teamPlayer')
    .addForeignKeyConstraint(
      'team_player_team_id_fkey', ['teamId'],
      'team', ['teamId'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('team')
    .addForeignKeyConstraint(
      'team_league_id_fkey', ['leagueId'],
      'league', ['leagueId'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('team')
    .addForeignKeyConstraint(
      'team_user_id_fkey', ['userId'],
      'dondUser', ['userId'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .addForeignKeyConstraint(
      'league_user_user_id_fkey', ['userId'],
      'dondUser', ['userId'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .addForeignKeyConstraint(
      'league_user_league_id_fkey', ['leagueId'],
      'league', ['leagueId'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('teamEntry')
    .addForeignKeyConstraint(
      'team_entry_team_id_fkey', ['teamId'],
      'team', ['teamId'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  //
  // 1. Drop all FK constraints added in `up`
  //
  await db.schema
    .alterTable('teamPlayer')
    .dropConstraint('team_player_team_id_fkey')
    .execute();

  await db.schema
    .alterTable('team')
    .dropConstraint('team_league_id_fkey')
    .execute();

  await db.schema
    .alterTable('team')
    .dropConstraint('team_user_id_fkey')
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .dropConstraint('league_user_user_id_fkey')
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .dropConstraint('league_user_league_id_fkey')
    .execute();

  await db.schema
    .alterTable('teamEntry')
    .dropConstraint('team_entry_team_id_fkey')
    .execute();

  //
  // 2. Revert all UUID→TEXT conversions
  //
  await sql`
    ALTER TABLE "team"
      ALTER COLUMN "team_id" TYPE TEXT USING "team_id"::text,
      ALTER COLUMN "league_id" TYPE TEXT USING "league_id"::text,
      ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
  `.execute(db);

  await sql`
    ALTER TABLE "team_player"
      ALTER COLUMN "team_id" TYPE TEXT USING "team_id"::text;
  `.execute(db);

  await sql`
    ALTER TABLE "league"
      ALTER COLUMN "league_id" TYPE TEXT USING "league_id"::text;
  `.execute(db);

  await sql`
    ALTER TABLE "league_user"
      ALTER COLUMN "league_id" TYPE TEXT USING "league_id"::text,
      ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
  `.execute(db);

  await sql`
    ALTER TABLE "dond_user"
      ALTER COLUMN "user_id" TYPE TEXT USING "user_id"::text;
  `.execute(db);

  //
  // 3. Restore the original FK constraints (the ones you dropped in `up`)
  //
  await db.schema
    .alterTable('teamPlayer')
    .addForeignKeyConstraint(
      'team_player_team_id_fkey',
      ['team_id'],
      'team',
      ['team_id'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .addForeignKeyConstraint(
      'league_user_league_id_fkey',
      ['league_id'],
      'league',
      ['league_id'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('leagueUser')
    .addForeignKeyConstraint(
      'league_user_user_id_fkey',
      ['user_id'],
      'dondUser',
      ['user_id'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('team')
    .addForeignKeyConstraint(
      'team_league_id_fkey',
      ['league_id'],
      'league',
      ['league_id'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();

  await db.schema
    .alterTable('team')
    .addForeignKeyConstraint(
      'team_user_id_fkey',
      ['user_id'],
      'dondUser',
      ['user_id'],
      (cb) => cb.onDelete('cascade')
    )
    .execute();
}
