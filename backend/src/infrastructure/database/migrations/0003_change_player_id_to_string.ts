import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('team_player')
    .alterColumn('player_id', (col) => col.setDataType('text'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('team_player')
    .alterColumn('player_id', (col) => col.setDataType('integer'))
    .execute();
}