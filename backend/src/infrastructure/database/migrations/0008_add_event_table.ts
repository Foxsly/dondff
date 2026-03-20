import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create event_group table
  await db.schema
    .createTable('event_group')
    .addColumn('event_group_id', 'uuid', (col) => col.primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .execute();

  // Create event table
  await db.schema
    .createTable('event')
    .addColumn('event_id', 'uuid', (col) => col.primaryKey())
    .addColumn('event_group_id', 'uuid', (col) =>
      col.notNull().references('event_group.event_group_id').onDelete('cascade'),
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('start_date', 'date', (col) => col.notNull())
    .addColumn('end_date', 'date', (col) => col.notNull())
    .addColumn('external_event_id', 'text')
    .addColumn('external_event_source', 'text')
    .execute();

  // Add event_group_id column to team table (before updating)
  await db.schema
    .alterTable('team')
    .addColumn('event_group_id', 'uuid', (col) =>
      col.references('event_group.event_group_id').onDelete('cascade'),
    )
    .execute();

  // Get all unique weeks from team table
  const teams = await db.selectFrom('team').select(['week']).distinct().execute();

  // For each unique week, create an event_group and event
  for (const team of teams) {
    const eventGroupId = crypto.randomUUID();
    const eventGroupName = `NFL Week ${team.week}`;

    // Insert event_group
    await db
      .insertInto('event_group')
      .values({
        event_group_id: eventGroupId,
        name: eventGroupName,
      })
      .execute();

    // Insert event with today's date
    const today = new Date().toISOString().split('T')[0];

    await db
      .insertInto('event')
      .values({
        event_id: crypto.randomUUID(),
        event_group_id: eventGroupId,
        name: eventGroupName,
        start_date: today,
        end_date: today,
        external_event_id: null,
        external_event_source: null,
      })
      .execute();

    // Update team.week to team.event_group_id
    await db
      .updateTable('team')
      .set({ event_group_id: eventGroupId })
      .where('week', '=', team.week)
      .execute();
  }

  // Drop the week column from team
  await db.schema.alterTable('team').dropColumn('week').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Add week column back to team (before updating)
  await db.schema.alterTable('team').addColumn('week', 'integer').execute();

  // Get all event_groups with their teams
  const eventGroups = await db
    .selectFrom('event_group')
    .innerJoin('event', 'event.event_group_id', 'event_group.event_group_id')
    .innerJoin('team', 'team.event_group_id', 'event_group.event_group_id')
    .select(['team.team_id', 'event_group.name'])
    .execute();

  // Extract week number from name (e.g., "NFL Week 1" -> 1)
  for (const eg of eventGroups) {
    const weekMatch = eg.name.match(/NFL Week (\d+)/);
    if (weekMatch) {
      const week = parseInt(weekMatch[1], 10);
      await db.updateTable('team').set({ week }).where('team_id', '=', eg.team_id).execute();
    }
  }

  // Make week not null
  await db.schema
    .alterTable('team')
    .alterColumn('week', (col) => col.setNotNull())
    .execute();

  // Drop event_group_id column from team
  await db.schema.alterTable('team').dropColumn('event_group_id').execute();

  // Drop event table
  await db.schema.dropTable('event').ifExists().execute();

  // Drop event_group table
  await db.schema.dropTable('event_group').ifExists().execute();
}
