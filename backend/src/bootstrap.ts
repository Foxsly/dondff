/**
 * Bootstrap launcher for distroless + rootless runtime.
 * - Runs DB migrations (and optional seeding) BEFORE starting the HTTP server.
 * - Respects Postgres-by-default, with SQLite as an explicit exception.
 *
 * NOTE:
 *  - Dockerfile CMD points to "dist/bootstrap.js"
 *  - This file compiles to "dist/bootstrap.js" (source at src/bootstrap.ts)
 */

/* eslint-disable no-console */

type MaybeFn = ((...args: any[]) => Promise<any>) | ((...args: any[]) => any);

function env(name: string, fallback?: string): string | undefined {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

async function runMigrationsIfPossible(): Promise<void> {
  // We try to import a migration module and execute a commonly used function.
  // This avoids tight coupling to a specific export name.
  // Known path in this repo:
  //   src/infrastructure/database/migrate.ts
  try {
    const mod = await import('./infrastructure/database/migrate.js');
    const candidateNames = ['runMigrations', 'migrate', 'default'];
    let runner: MaybeFn | undefined;
    for (const key of candidateNames) {
      const maybe = (mod as any)[key];
      if (typeof maybe === 'function') {
        runner = maybe as MaybeFn;
        break;
      }
    }
    if (!runner) {
      console.warn('[bootstrap] No runnable migration function exported by infrastructure/database/migrate');
      return;
    }
    console.log('[bootstrap] Running migrations…');
    await Promise.resolve(runner());
    console.log('[bootstrap] Migrations complete.');
  } catch (err: any) {
    console.error('[bootstrap] Migration step failed or migrate module not found:', err?.message ?? err);
    throw err;
  }
}

/**
 * TODO - Add seed module (this seems like a cool idea) and un-comment/test this.
 */
/*async function runSeedIfRequested(): Promise<void> {
  const runSeed = (env('RUN_SEED', 'false') ?? 'false').toLowerCase() === 'true';
  if (!runSeed) return;
  try {
    // If you have a dedicated seed module, import and execute it here.
    // We keep this optional—absence should not be fatal in production.
    const mod = await import('./infrastructure/database/seed');
    const candidateNames = ['runSeed', 'seed', 'default'];
    let seeder: MaybeFn | undefined;
    for (const key of candidateNames) {
      const maybe = (mod as any)[key];
      if (typeof maybe === 'function') {
        seeder = maybe as MaybeFn;
        break;
      }
    }
    if (!seeder) {
      console.warn('[bootstrap] RUN_SEED=true but no seed function exported by infrastructure/database/seed');
      return;
    }
    console.log('[bootstrap] Running seed…');
    await Promise.resolve(seeder());
    console.log('[bootstrap] Seed complete.');
  } catch (err: any) {
    // Seeding is optional; log and continue.
    console.warn('[bootstrap] RUN_SEED=true but seeding failed or seed module not found:', err?.message ?? err);
  }
}*/

function logConfigPreview(): void {
  const DB_ENGINE = env('DB_ENGINE', 'postgres'); // default
  const DATABASE_URL = env('DATABASE_URL');
  const SQLITE_DB_PATH = env('SQLITE_DB_PATH');
  const NODE_ENV = env('NODE_ENV', 'production');
  const PORT = env('PORT', '3001');
  const RUN_SEED = env('RUN_SEED', 'false');

  // Redact connection details lightly
  const redact = (s?: string) => (s ? s.replace(/:\/\/([^:@]+):?([^@]*)@/, '://****:****@') : s);

  console.log('[bootstrap] Environment preview:');
  console.log('  NODE_ENV       =', NODE_ENV);
  console.log('  PORT           =', PORT);
  console.log('  DB_ENGINE      =', DB_ENGINE);
  console.log('  DATABASE_URL   =', redact(DATABASE_URL));
  console.log('  SQLITE_DB_PATH =', SQLITE_DB_PATH);
  console.log('  RUN_SEED       =', RUN_SEED);
}

async function startHttpServer(): Promise<void> {
  // Typical NestJS main.ts immediately creates and boots the app on import.
  // Importing it here starts the server AFTER migrations/seed have run.
  // If your main.ts instead exports a function, adjust to call it explicitly.
  console.log('[bootstrap] Starting HTTP server…');
  await import('./main.js');
  console.log('[bootstrap] HTTP server started.');
}

async function main(): Promise<void> {
  try {
    logConfigPreview();

    // Postgres-by-default, SQLite as an exception is enforced by env read in your DB layer.
    // Here we just run migrations before starting the app.
    await runMigrationsIfPossible();
    // await runSeedIfRequested();

    await startHttpServer();
  } catch (err: any) {
    console.error('[bootstrap] Fatal error during startup:', err?.stack ?? err);
    // In containers, a nonzero exit triggers a restart depending on policy.
    process.exit(1);
  }
}

// Kick off
void main();
