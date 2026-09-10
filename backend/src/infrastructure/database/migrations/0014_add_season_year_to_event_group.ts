import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('event_group')
    .addColumn('season_year', 'integer', (col) => col.notNull().defaultTo(2025))
    .execute();

  // Backfill from external_event_id where possible (e.g. "2025-4" → 2025)
  const rows = await db
    .selectFrom('event_group')
    .innerJoin('event', 'event.event_group_id', 'event_group.event_group_id')
    .select(['event_group.event_group_id', 'event.external_event_id'])
    .execute();

  for (const row of rows) {
    if (row.external_event_id) {
      const year = Number(row.external_event_id.split('-')[0]);
      if (Number.isFinite(year) && year > 2000) {
        await db
          .updateTable('event_group')
          .set({ season_year: year })
          .where('event_group_id', '=', row.event_group_id)
          .execute();
      }
    }
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('event_group').dropColumn('season_year').execute();
}
