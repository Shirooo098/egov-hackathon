import { Pool, Client } from 'pg';

let pool: Pool | undefined;
let directClient: Client | undefined;

function connectionOptions(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL is required for database-backed routes');
  try {
    const parsed = new URL(connectionString);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('invalid');
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }
  const configuredMax = process.env.DB_POOL_MAX;
  const max = configuredMax === undefined ? 10 : Number(configuredMax);
  if (!Number.isInteger(max) || max < 1) throw new Error('DB_POOL_MAX must be a positive integer');
  return {
    connectionString,
    max,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined
  };
}

function getPool() {
  if (!pool) {
    pool = new Pool(connectionOptions());
  }
  return pool;
}

function setPool(nextPool: Pool): void {
  pool = nextPool;
}

async function closePool(): Promise<void> {
  const currentPool = pool;
  pool = undefined;
  if (currentPool) await currentPool.end();
  const currentClient = directClient;
  directClient = undefined;
  if (currentClient) await currentClient.end();
}

function getDirectClient() {
  if (!directClient) {
    directClient = new Client(connectionOptions(process.env.DATABASE_DIRECT_URL || process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL));
  }
  return directClient;
}

async function connectDirect() {
  const client = getDirectClient();
  if (!(client as Client & { _connected?: boolean })._connected) await client.connect();
  return client;
}

export { getPool, setPool, closePool, connectionOptions, getDirectClient, connectDirect };
