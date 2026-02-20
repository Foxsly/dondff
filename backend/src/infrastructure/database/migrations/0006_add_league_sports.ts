import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add sport_league column with default 'NFL'
  await db.schema
    .alterTable('league_settings')
    .addColumn('sport_league', 'text', (c) => c.notNull().defaultTo('NFL'))
    .execute();

  // Create LEAGUE_SETTINGS_POSITION table
  await db.schema
    .createTable('league_settings_position')
    .addColumn('league_settings_id', 'uuid', (c) =>
      c.notNull().references('league_settings.league_settings_id').onDelete('cascade'),
    )
    .addColumn('position', 'text', (c) => c.notNull())
    .addColumn('pool_size', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('created_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addColumn('updated_at', 'timestamp', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .addPrimaryKeyConstraint('league_settings_position_pkey', ['league_settings_id', 'position'])
    .execute();

  await db.schema
    .createIndex('ix_league_settings_position_settings')
    .on('league_settings_position')
    .columns(['league_settings_id'])
    .execute();

  // Migrate existing league settings to use the new position table
  // Since pool sizes have never been user-configurable, use default values
  const existingSettings = await db
    .selectFrom('league_settings')
    .select(['league_settings_id', 'positions'])
    .execute();
  
  for (const setting of existingSettings) {
    const now = new Date().toISOString();
    
    // Parse the positions JSON array, default to ['RB', 'WR'] if invalid
    let positions: string[] = ['RB', 'WR'];
    try {
      if (setting.positions) {
        if (typeof setting.positions === 'string') {
          const parsed = JSON.parse(setting.positions);
          if (Array.isArray(parsed) && parsed.length > 0) {
            positions = parsed.map(String);
          }
        } else if (Array.isArray(setting.positions)) {
          positions = setting.positions.map(String);
        }
      }
    } catch (e) {
      // Keep default ['RB', 'WR'] if parsing fails
    }
    
    // Create position entries with default pool sizes
    const positionEntries = positions.map(position => {
      let poolSize;
      switch (position) {
        case 'RB': poolSize = 64; break;
        case 'WR': poolSize = 96; break;
        case 'QB': poolSize = 32; break;
        case 'TE': poolSize = 32; break;
        default: poolSize = 100; // Default for any other positions
      }
      
      return {
        league_settings_id: setting.league_settings_id,
        position: position,
        pool_size: poolSize,
        created_at: now,
        updated_at: now,
      };
    });
    
    if (positionEntries.length > 0) {
      await db.insertInto('league_settings_position').values(positionEntries).execute();
    }
  }

  // Drop old columns after migration is complete
  await db.schema.alterTable('league_settings').dropColumn('rb_pool_size').execute();
  await db.schema.alterTable('league_settings').dropColumn('wr_pool_size').execute();
  await db.schema.alterTable('league_settings').dropColumn('qb_pool_size').execute();
  await db.schema.alterTable('league_settings').dropColumn('te_pool_size').execute();
  await db.schema.alterTable('league_settings').dropColumn('positions').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Before dropping the position table, migrate data back to the old columns
  // Since pool sizes have never been user-configurable, use default values
  const existingPositions = await db
    .selectFrom('league_settings_position')
    .select(['league_settings_id', 'position'])
    .execute();
  
  // Create a map to store positions by league settings ID
  const settingsMap = new Map<string, { positions: string[], rb: number, wr: number, qb: number, te: number }>();
  
  for (const pos of existingPositions) {
    if (!settingsMap.has(pos.league_settings_id)) {
      settingsMap.set(pos.league_settings_id, { 
        positions: [], 
        rb: 64, wr: 96, qb: 32, te: 32 // Default values
      });
    }
    
    const data = settingsMap.get(pos.league_settings_id);
    // @ts-ignore
    data.positions.push(pos.position);
    
    // Note: We ignore the actual pool_size values and use defaults
    // since pool sizes have never been user-configurable
  }
  
  // Update league_settings rows with the migrated data using default pool sizes
  for (const [leagueSettingsId, data] of settingsMap) {
    await db
      .updateTable('league_settings')
      .set({
        positions: JSON.stringify(data.positions),
        rb_pool_size: data.rb,
        wr_pool_size: data.wr,
        qb_pool_size: data.qb,
        te_pool_size: data.te,
      })
      .where('league_settings_id', '=', leagueSettingsId)
      .execute();
  }
  
  // Drop the LEAGUE_SETTINGS_POSITION table
  await db.schema.dropTable('league_settings_position').execute();

  // Drop the sport_league column
  await db.schema.alterTable('league_settings').dropColumn('sport_league').execute();
}