import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('event_group')
    .addColumn('start_date', 'text')
    .execute();

  await db.schema
    .alterTable('event_group')
    .addColumn('end_date', 'text')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('event_group').dropColumn('start_date').execute();
  await db.schema.alterTable('event_group').dropColumn('end_date').execute();
}
