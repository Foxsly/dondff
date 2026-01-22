// src/infrastructure/database/migrations/0001_init.ts
import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // dond_user
  await db.schema
    .createTable('dond_user')
    .addColumn('user_id', 'text', (col) => col.primaryKey())
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // league
  await db.schema
    .createTable('league')
    .addColumn('league_id', 'text', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // team
  await db.schema
    .createTable('team')
    .addColumn('team_id', 'text', (col) => col.primaryKey())
    .addColumn('league_id', 'text', (col) =>
      col.notNull().references('league.league_id').onDelete('cascade')
    )
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('dond_user.user_id').onDelete('cascade')
    )
    .addColumn('season_year', 'integer', (col) => col.notNull())
    .addColumn('week', 'integer', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  // team_player (composite PK: team_id + position)
  await db.schema
    .createTable('team_player')
    .addColumn('team_id', 'text', (col) =>
      col.notNull().references('team.team_id').onDelete('cascade')
    )
    .addColumn('position', 'text', (col) => col.notNull())
    .addColumn('player_id', 'integer', (col) => col.notNull())
    .addColumn('player_name', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('pk_team_player', ['team_id', 'position'])
    .execute();

  // league_user (composite PK: user_id + league_id)
  await db.schema
    .createTable('league_user')
    .addColumn('user_id', 'text', (col) =>
      col.notNull().references('dond_user.user_id').onDelete('cascade')
    )
    .addColumn('league_id', 'text', (col) =>
      col.notNull().references('league.league_id').onDelete('cascade')
    )
    .addColumn('role', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('pk_league_user', ['user_id', 'league_id'])
    .execute();

  // indexes
  await db.schema.createIndex('idx_team_league_id').on('team').column('league_id').execute();
  await db.schema.createIndex('idx_team_user_id').on('team').column('user_id').execute();
  await db.schema.createIndex('idx_league_user_league_id').on('league_user').column('league_id').execute();
  await db.schema.createIndex('idx_league_user_user_id').on('league_user').column('user_id').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropIndex('idx_league_user_user_id').ifExists().execute();
  await db.schema.dropIndex('idx_league_user_league_id').ifExists().execute();
  await db.schema.dropIndex('idx_team_user_id').ifExists().execute();
  await db.schema.dropIndex('idx_team_league_id').ifExists().execute();

  await db.schema.dropTable('league_user').ifExists().execute();
  await db.schema.dropTable('team_player').ifExists().execute();
  await db.schema.dropTable('team').ifExists().execute();
  await db.schema.dropTable('league').ifExists().execute();
  await db.schema.dropTable('dond_user').ifExists().execute();
}