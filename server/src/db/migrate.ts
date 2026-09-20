import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient, Pool } from 'pg';
import { getPool, connectDirect } from './pool.js';
import { isLiveMode } from '../runtime/config.js';
import type { RuntimeMode } from '../runtime/config.js';

export interface MigrateOptions {
  targetPool?: Pool;
  closeOnEnd?: boolean;
}

export async function migrate(options: MigrateOptions = {}) {
  const migrationsDir = path.join(dirname(fileURLToPath(import.meta.url)), 'migrations');
  const direct = process.env.DB_MIGRATION_MODE === 'direct' || process.env.MIGRATION_DATABASE_URL;
  const db = options.targetPool || (direct ? await connectDirect() : getPool());
  
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  const appliedRows = await db.query('SELECT version FROM schema_migrations ORDER BY version ASC');
  const appliedVersions = new Set(appliedRows.rows.map((r: { version: string }) => r.version));

  // Enforce forward-only migrations: verify that all recorded versions match the source migrations in order
  for (const applied of appliedRows.rows) {
    const expectedFile = `${applied.version}.sql`;
    if (!files.includes(expectedFile)) {
      throw new Error(`Migration consistency error: applied migration ${applied.version} is not in migrations directory`);
    }
  }

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (appliedVersions.has(version)) continue;

    const transaction = options.targetPool
      ? await options.targetPool.connect()
      : (direct ? await connectDirect() : await getPool().connect());

    await transaction.query('BEGIN');
    try {
      await transaction.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      await transaction.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await transaction.query('COMMIT');
    } catch (error) {
      await transaction.query('ROLLBACK');
      throw error;
    } finally {
      if (options.targetPool || !direct) {
        (transaction as PoolClient).release();
      }
    }
  }

  // Blank live boundary check: if in live mode, ensure no synthetic records exist
  const mode = (process.env.EBUHAY_MODE || 'synthetic') as RuntimeMode;
  if (isLiveMode(mode) || process.env.SYNTHETIC_MODE !== 'true') {
    const syntheticHospitals = await db.query('SELECT count(*) FROM hospitals WHERE synthetic = true');
    if (parseInt(syntheticHospitals.rows[0]?.count || '0', 10) > 0) {
      throw new Error('Live database initialization failed: synthetic records detected in live boundary');
    }
  }

  if (options.closeOnEnd !== false) {
    if (!options.targetPool) {
      await db.end();
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export default migrate;
