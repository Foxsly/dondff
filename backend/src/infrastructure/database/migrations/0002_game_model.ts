import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // league_settings (append-only: enforce at app layer)
  await db.schema
    .createTable('league_settings')
    .addColumn('league_settings_id', 'uuid', (c) => c.primaryKey().notNull())
    .addColumn('league_id', 'uuid', (c) => c.notNull())
    .addColumn('scoring_type', 'text', (c) => c.notNull()) // 'PPR' | 'HALF_PPR' | 'STANDARD'
    .addColumn('positions', 'text', (c) => c.notNull()) // store JSON string e.g. '["QB","RB"]'
    .addColumn('rb_pool_size', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('wr_pool_size', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('qb_pool_size', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('te_pool_size', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('ix_league_settings_league_created')
    .on('league_settings')
    .columns(['league_id', 'created_at'])
    .execute();

  // team_entry
  await db.schema
    .createTable('team_entry')
    .addColumn('team_entry_id', 'uuid', (c) => c.primaryKey().notNull())
    .addColumn('team_id', 'uuid', (c) => c.notNull())
    .addColumn('position', 'text', (c) => c.notNull())
    .addColumn('league_settings_id', 'uuid', (c) =>
      c.notNull().references('league_settings.league_settings_id').onDelete('restrict'),
    )
    .addColumn('reset_count', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('selected_box', 'integer')
    .addColumn(
      'status',
      'text',
      (c) => c.notNull().defaultTo('pending')
        .check(sql`status in ('pending','playing','finished')`),
    )
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('ix_team_entry_team_pos')
    .on('team_entry')
    .columns(['team_id', 'position'])
    .execute();

  // team_entry_audit
  await db.schema
    .createTable('team_entry_audit')
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

  await db.schema
    .createIndex('ux_audit_entry_reset_box')
    .on('team_entry_audit')
    .columns(['team_entry_id', 'reset_number', 'box_number'])
    .unique()
    .execute();

  // team_entry_offer (specific player; no reset_number, no offer_round)
  await db.schema
    .createTable('team_entry_offer')
    .addColumn('offer_id', 'uuid', (c) => c.primaryKey().notNull())
    .addColumn('team_entry_id', 'uuid', (c) =>
      c.notNull().references('team_entry.team_entry_id').onDelete('cascade'),
    )
    .addColumn('player_id', 'text', (c) => c.notNull())
    .addColumn('player_name', 'text', (c) => c.notNull())
    .addColumn('injury_status', 'text')
    .addColumn('projected_points', 'numeric', (c) => c.notNull())
    .addColumn(
      'status',
      'text',
      (c) => c.notNull().defaultTo('pending')
        .check(sql`status in ('accepted','rejected','pending')`),
    )
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('ix_offer_entry_status')
    .on('team_entry_offer')
    .columns(['team_entry_id', 'status'])
    .execute();

  // team_entry_event
  await db.schema
    .createTable('team_entry_event')
    .addColumn('event_id', 'uuid', (c) => c.primaryKey().notNull())
    .addColumn('team_entry_id', 'uuid', (c) =>
      c.notNull().references('team_entry.team_entry_id').onDelete('cascade'),
    )
    .addColumn(
      'event_type',
      'text',
      (c) => c.notNull().check(
        sql`event_type in ('start','reset','boxes_generated','box_selected','box_eliminated','offer_made','offer_accepted','offer_rejected','end')`,
      ),
    )
    .addColumn('reset_number', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('round', 'integer')
    .addColumn('payload', 'text') // JSON string; PG users can switch to jsonb
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();

  await db.schema
    .createIndex('ix_event_entry_time')
    .on('team_entry_event')
    .columns(['team_entry_id', 'created_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('team_entry_event').execute();
  await db.schema.dropIndex('ix_offer_entry_status').on('team_entry_offer').execute();
  await db.schema.dropTable('team_entry_offer').execute();
  await db.schema.dropIndex('ux_audit_entry_reset_box').on('team_entry_audit').execute();
  await db.schema.dropTable('team_entry_audit').execute();
  await db.schema.dropIndex('ix_team_entry_team_pos').on('team_entry').execute();
  await db.schema.dropTable('team_entry').execute();
  await db.schema.dropIndex('ix_league_settings_league_created').on('league_settings').execute();
  await db.schema.dropTable('league_settings').execute();
}