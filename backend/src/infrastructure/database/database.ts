import { Kysely, CamelCasePlugin, ParseJSONResultsPlugin } from 'kysely';
import { SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';
import * as path from 'path';
import type { DB } from './types';

// Helper: narrow NODE_ENV
type NodeEnv = 'development' | 'test' | 'production';

function getEnv(key: string, fallback?: string): string {
  const v = process.env[key];
  if (v == null || v === '') {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

function boolEnv(key: string, fallback = false): boolean {
  const v = process.env[key];
  if (v == null) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
}

export function createDb(): Kysely<DB> {
  const engine = (process.env.DB_ENGINE ?? 'sqlite').toLowerCase();

  if (engine === 'postgres' || engine === 'postgresql' || engine === 'pg') {
    const connectionString = getEnv('DATABASE_URL');
    const useSSL = boolEnv('PGSSL', false);

    const pool = new Pool({
      connectionString,
      ssl: useSSL ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PGPOOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.PGPOOL_IDLE_MS ?? 30_000),
    });

    return new Kysely<DB>({
      dialect: new PostgresDialect({ pool }),
      plugins: [new CamelCasePlugin()],
    });
  }

  // default: sqlite (for dev)
  const dbPath = process.env.SQLITE_DB_PATH ?? path.resolve(process.cwd(), 'dev.db');
  const sqlite = new Database(dbPath);
  // enforce FK in sqlite
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  return new Kysely<DB>({
    dialect: new SqliteDialect({ database: sqlite }),
    plugins: [new CamelCasePlugin(), new ParseJSONResultsPlugin()],
    log: ['query', 'error']
  });
}

// Singleton for app usage
let _db: Kysely<DB> | null = null;
export function db(): Kysely<DB> {
  if (!_db) _db = createDb();
  return _db;
}
