import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // First, drop the existing constraint on team_entry_audit.box_status
  // The exact constraint name depends on the database engine
  const engine = process.env.DB_ENGINE ?? 'sqlite';

  if (engine === 'postgres') {
    // For PostgreSQL, we need to find and drop the constraint
    await sql`
      ALTER TABLE team_entry_audit
      DROP CONSTRAINT IF EXISTS team_entry_audit_box_status_check
    `.execute(db);
  }
  // For SQLite, we can't easily drop constraints, so we'll recreate the table

  // Update the constraint to include 'swapped' status
  if (engine === 'postgres') {
    await sql`
      ALTER TABLE team_entry_audit
      ADD CONSTRAINT team_entry_audit_box_status_check
      CHECK (box_status in ('selected','eliminated','available','reset','swapped'))
    `.execute(db);
  } else if (engine === 'sqlite') {
    // For SQLite, we need to recreate the table with the updated constraint
    // First, create a temporary table with the new structure
    await db.schema
      .createTable('team_entry_audit_new')
      .addColumn('audit_id', 'uuid', (c) => c.primaryKey().notNull())
      .addColumn('team_entry_id', 'uuid', (c) =>
        c.notNull().references('team_entry.team_entry_id').onDelete('cascade'),
      )
      .addColumn('reset_number', 'integer', (c) => c.notNull().defaultTo(0))
      .addColumn('box_number', 'integer', (c) => c.notNull())
      .addColumn('player_id', 'text', (c) => c.notNull())
      .addColumn('player_name', 'text', (c) => c.notNull())
      .addColumn('projected_points', 'numeric', (c) => c.notNull())
      .addColumn('injury_status', 'text')
      .addColumn(
        'box_status',
        'text',
        (c) => c.notNull()
          .check(sql`box_status in ('selected','eliminated','available','reset','swapped')`),
      )
      .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Copy data from old table to new table
    await sql`
      INSERT INTO team_entry_audit_new
      SELECT * FROM team_entry_audit
    `.execute(db);

    // Drop the old table
    await db.schema.dropTable('team_entry_audit').execute();

    // Rename the new table to the original name
    await db.schema.alterTable('team_entry_audit_new').renameTo('team_entry_audit').execute();

    // Recreate the index
    await db.schema
      .createIndex('ux_audit_entry_reset_box')
      .on('team_entry_audit')
      .columns(['team_entry_id', 'reset_number', 'box_number'])
      .unique()
      .execute();
  }
}

export async function down(db: Kysely<any>): Promise<void> {
  const engine = process.env.DB_ENGINE ?? 'sqlite';

  if (engine === 'postgres') {
    // For PostgreSQL, drop the constraint and recreate with original values
    await sql`
      ALTER TABLE team_entry_audit
      DROP CONSTRAINT IF EXISTS team_entry_audit_box_status_check
    `.execute(db);

    await sql`
      ALTER TABLE team_entry_audit
      ADD CONSTRAINT team_entry_audit_box_status_check
      CHECK (box_status in ('selected','eliminated','available','reset'))
    `.execute(db);
  } else if (engine === 'sqlite') {
    // For SQLite, recreate the table without 'swapped' status
    await db.schema
      .createTable('team_entry_audit_new')
      .addColumn('audit_id', 'uuid', (c) => c.primaryKey().notNull())
      .addColumn('team_entry_id', 'uuid', (c) =>
        c.notNull().references('team_entry.team_entry_id').onDelete('cascade'),
      )
      .addColumn('reset_number', 'integer', (c) => c.notNull().defaultTo(0))
      .addColumn('box_number', 'integer', (c) => c.notNull())
      .addColumn('player_id', 'text', (c) => c.notNull())
      .addColumn('player_name', 'text', (c) => c.notNull())
      .addColumn('projected_points', 'numeric', (c) => c.notNull())
      .addColumn('injury_status', 'text')
      .addColumn(
        'box_status',
        'text',
        (c) => c.notNull()
          .check(sql`box_status in ('selected','eliminated','available','reset')`),
      )
      .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
      .execute();

    // Copy data from old table to new table (excluding any 'swapped' status rows)
    await sql`
      INSERT INTO team_entry_audit_new
      SELECT * FROM team_entry_audit
      WHERE box_status != 'swapped'
    `.execute(db);

    // Drop the old table
    await db.schema.dropTable('team_entry_audit').execute();

    // Rename the new table to the original name
    await db.schema.alterTable('team_entry_audit_new').renameTo('team_entry_audit').execute();

    // Recreate the index
    await db.schema
      .createIndex('ux_audit_entry_reset_box')
      .on('team_entry_audit')
      .columns(['team_entry_id', 'reset_number', 'box_number'])
      .unique()
      .execute();
  }
}
