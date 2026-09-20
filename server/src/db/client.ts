import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { getPool, connectDirect, getDirectClient } from './pool.js';
import * as schema from './schema.js';

type DbOptions = { mode?: 'pool' | 'direct' };
type Database = NodePgDatabase<typeof schema>;

function getDb(options: DbOptions = {}): Database {
  const mode = options.mode || process.env.DB_CONNECTION_MODE || 'pool';
  if (mode === 'direct') return drizzle(getDirectClient(), { schema });
  return drizzle(getPool(), { schema });
}

async function getDirectDb() {
  await connectDirect();
  return getDb({ mode: 'direct' });
}

async function withTransaction<T>(callback: (tx: Database) => Promise<T>): Promise<T> {
  const db = getDb();
  return db.transaction(callback);
}

export { getDb, getDirectDb, withTransaction };
