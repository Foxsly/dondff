import { Kysely } from 'kysely/dist/esm';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('event_group')
    .addColumn('sportLeague', 'text', (col) => col.notNull().defaultTo('NFL'))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('event_group').dropColumn('sportLeague').execute();
}