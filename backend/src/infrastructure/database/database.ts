import { Kysely, CamelCasePlugin } from 'kysely';
import { Pool } from 'pg';
import { PostgresDialect } from 'kysely';
import type { DB } from './types';

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

// Singleton for app usage
let _db: Kysely<DB> | null = null;
export function db(): Kysely<DB> {
  if (!_db) _db = createDb();
  return _db;
}