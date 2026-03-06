import { Kysely, sql } from 'kysely';

const TABLE = 'league';
const CHECK_NAME = 'ck_league_sport';

export async function up(db: Kysely<any>): Promise<void> {
    const engine = process.env.DB_ENGINE ?? 'sqlite';

    if (engine === 'sqlite') {
        // 1) Create new table with sport + CHECK constraint
        await sql`
      CREATE TABLE league_new (
        league_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sport TEXT NOT NULL DEFAULT 'NFL' CHECK (sport IN ('NFL','GOLF')),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

        // 2) Copy existing data (sport will take DEFAULT 'NFL')
        await sql`
      INSERT INTO league_new (league_id, name, created_at)
      SELECT league_id, name, created_at
      FROM ${sql.table(TABLE)}
    `.execute(db);

        // 3) Swap tables
        await sql`DROP TABLE ${sql.table(TABLE)}`.execute(db);
        await sql`ALTER TABLE league_new RENAME TO ${sql.table(TABLE)}`.execute(db);
    } else if (engine === 'postgres') {
        await db.schema
            .alterTable(TABLE)
            .addColumn('sport', 'text', (col) => col.notNull().defaultTo('NFL'))
            .execute();

        await sql`
            ALTER TABLE ${sql.table(TABLE)}
                ADD CONSTRAINT ${sql.raw(CHECK_NAME)}
                    CHECK (sport IN ('NFL','GOLF'))
        `.execute(db);
    } else {
        throw new Error(`Unsupported DB_ENGINE: ${engine}`);
    }
}

export async function down(db: Kysely<any>): Promise<void> {
    const engine = process.env.DB_ENGINE ?? 'sqlite';

    if (engine === 'sqlite') {
        // Recreate original schema without sport
        await sql`
      CREATE TABLE league_new (
        league_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `.execute(db);

        await sql`
            INSERT INTO league_new (league_id, name, created_at)
            SELECT league_id, name, created_at
            FROM ${sql.table(TABLE)}
        `.execute(db);

        await sql`DROP TABLE ${sql.table(TABLE)}`.execute(db);
        await sql`ALTER TABLE league_new RENAME TO ${sql.table(TABLE)}`.execute(db);
    } else if (engine === 'postgres') {
        await sql`
            ALTER TABLE ${sql.table(TABLE)}
            DROP CONSTRAINT IF EXISTS ${sql.raw(CHECK_NAME)}
        `.execute(db);

        await db.schema.alterTable(TABLE).dropColumn('sport').execute();
    } else {
        throw new Error(`Unsupported DB_ENGINE: ${engine}`);
    }
}
