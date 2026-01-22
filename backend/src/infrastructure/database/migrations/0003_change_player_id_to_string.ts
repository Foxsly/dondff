import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  const engine = process.env.DB_ENGINE ?? 'sqlite';

  if (engine === 'sqlite') {
    await db.schema.alterTable('team_player').renameTo('team_player_old').execute();
    // await sql`ALTER TABLE team_player RENAME TO team_player_old`.execute(db);
    // team_player (composite PK: team_id + position)
    await db.schema
      .createTable('team_player')
      .addColumn('team_id', 'text', (col) =>
        col.notNull().references('team.team_id').onDelete('cascade')
      )
      .addColumn('position', 'text', (col) => col.notNull())
      .addColumn('player_id', 'text', (col) => col.notNull())
      .addColumn('player_name', 'text', (col) => col.notNull())
      .addPrimaryKeyConstraint('pk_team_player', ['team_id', 'position'])
      .execute();

    await db
      .insertInto('team_player')
      .columns(['team_id', 'position', 'player_id', 'player_name'])
      .expression((eb) => eb.selectFrom('team_player_old').selectAll())
      .execute();

    await db.schema.dropTable('team_player_old').execute();
  } else if (engine === 'postgres') {
    // Postgres: alter column type directly
    await db.schema
      .alterTable('team_player')
      .alterColumn('player_id', (col) => col.setDataType('text'))
      .execute();
  } else {
    throw new Error(`Unsupported DB_ENGINE: ${engine}`);
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  const engine = process.env.DB_ENGINE ?? 'sqlite';

  if (engine === 'sqlite') {
    await db.schema.alterTable('team_player').renameTo('team_player_string').execute();
    // await sql`ALTER TABLE team_player RENAME TO team_player_string`.execute(db);

    await db.schema
      .createTable('team_player')
      .addColumn('id', 'text', (c) => c.primaryKey())
      .addColumn('team_id', 'text', (c) => c.notNull())
      .addColumn('player_id', 'integer', (c) => c.notNull())
      .addColumn('player_name', 'text', (c) => c.notNull())
      .addColumn('position', 'text', (c) => c.notNull())
      .execute();

    await db
      .insertInto('team_player')
      .columns(['id', 'team_id', 'player_id', 'player_name', 'position'])
      .expression((eb) =>
        eb
          .selectFrom('team_player_string')
          .select([
            'id',
            'team_id',
            sql<number>`CAST(player_id AS INTEGER)`.as('player_id'),
            'player_name',
            'position',
          ]),
      )
      .execute();

    await db.schema.dropTable('team_player_string').execute();
  } else if (engine === 'postgres') {
    await db.schema
      .alterTable('team_player')
      .alterColumn('player_id', (col) => col.setDataType('integer'))
      .execute();
  } else {
    throw new Error(`Unsupported DB_ENGINE: ${engine}`);
  }
}
