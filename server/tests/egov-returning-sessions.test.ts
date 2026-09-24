import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { currentSession, listSessions, listVerificationHistory, revokeSession } from '../src/auth/service.js';
import { createEgovAuthRouter, createEgovCallbackRouter } from '../src/routes/egov-auth.js';
import { createCsrfProtection, v1Cors } from '../src/middleware/v1-security.js';
import { setPool, closePool } from '../src/db/pool.js';
import type { RuntimeConfig } from '../src/runtime/config.js';
import type { Pool } from 'pg';
import { execFileSync } from 'node:child_process';

type Query = { sql: string; params: unknown[] };
const hash = (v: string) => crypto.createHash('sha256').update(v).digest();
const account = (id = 'acct-1') => ({ id, role: 'citizen', display_name: 'Old Name', service_scope: [], hospital_id: null, status: 'active' });

type SessionRow = { id: string; token_hash?: Buffer; created_at: Date; last_seen_at: Date; expires_at: Date; revoked_at: Date | null; current?: boolean };
function sessionExecutor(rows: SessionRow[]) {
  const queries: Query[] = [];
  const executor: any = {
    async query(sql: string, params: unknown[] = []) {
      queries.push({ sql, params });
      if (sql.startsWith('UPDATE sessions s SET')) {
        const now = params[1] as Date;
        const row = rows.find((r) => r.token_hash?.equals(params[0] as Buffer) && !r.revoked_at && r.expires_at > now && r.last_seen_at > new Date(now.getTime() - 30 * 60_000));
        if (!row) return { rowCount: 0, rows: [] };
        row.last_seen_at = now;
        return { rowCount: 1, rows: [account('acct-1')] };
      }
      if (sql.startsWith('SELECT id, created_at')) {
        const currentHash = params[1] as Buffer | null;
        return { rowCount: rows.length, rows: rows.map((row) => ({ ...row, current: Boolean(currentHash && row.token_hash?.equals(currentHash)) })) };
      }
      if (sql.startsWith('SELECT verified_at')) return { rowCount: 1, rows: [{ verified_at: new Date('2030-01-01'), source: 'egov.synthetic', display_name: 'Safe Name', profile: { secret: 'redacted' } }] };
      if (sql.startsWith('UPDATE sessions SET revoked_at')) {
        const row = rows.find((r) => r.id === params[0] && r.id === 'owned' && !r.revoked_at);
        if (!row) return { rowCount: 0, rows: [] };
        row.revoked_at = new Date('2030-01-02');
        return { rowCount: 1, rows: [{ id: row.id, revokedAt: row.revoked_at }] };
      }
      return { rowCount: 1, rows: [] };
    },
    async connect() { return this; },
    release() {},
  };
  return { executor, queries };
}

test('current session enforces 30m inactivity plus DB expiry (the 8h absolute bound), and list marks current without exposing hashes', async () => {
  const now = new Date('2030-01-01T12:00:00Z');
  const token = 'a'.repeat(43);
  const fresh = sessionExecutor([{ id: 's1', token_hash: hash(token), created_at: now, last_seen_at: new Date(now.getTime() - 29 * 60_000), expires_at: new Date(now.getTime() + 8 * 60 * 60_000), revoked_at: null }]);
  assert.equal((await currentSession(token, { executor: fresh.executor, now }))?.id, 'acct-1');
  assert.match(fresh.queries[0].sql, /last_seen_at > \$2 - interval '30 minutes'/);
  assert.match(fresh.queries[0].sql, /expires_at > \$2/);
  const listed = await listSessions('acct-1', token, { executor: fresh.executor });
  assert.equal(listed[0].current, true);
  assert.equal(Object.keys(listed[0]).includes('tokenHash'), false);
  const history = await listVerificationHistory('acct-1', fresh.executor);
  assert.deepEqual(history, [{ verifiedAt: new Date('2030-01-01'), source: 'egov.synthetic', displayName: 'Safe Name' }]);
});

test('remote revoke is owner-only, audited once, and repeated/cross-owner attempts do not commit', async () => {
  const fake = sessionExecutor([{ id: 'owned', created_at: new Date(), last_seen_at: new Date(), expires_at: new Date('2040-01-01'), revoked_at: null }]);
  const revoked = await revokeSession('acct-1', 'owned', { executor: fake.executor });
  assert.equal(revoked?.id, 'owned');
  assert.equal(fake.queries.filter((q) => q.sql.includes('action, target_reference')).length, 1);
  const repeat = await revokeSession('acct-1', 'owned', { executor: fake.executor });
  assert.equal(repeat, null);
  assert.equal(fake.queries.filter((q) => q.sql.includes('action, target_reference')).length, 1);
  const cross = await revokeSession('other-account', 'owned', { executor: fake.executor });
  assert.equal(cross, null);
  assert.equal(fake.queries.filter((q) => q.sql === 'COMMIT').length, 1);
  assert.match(fake.queries.find((q) => q.sql.startsWith('UPDATE sessions SET revoked_at'))!.sql, /WHERE id=\$1 AND account_id=\$2 AND revoked_at IS NULL/);
});

test('session TTL configuration falls back to 8h and clamps to 15m..8h', () => {
  const run = (value?: string) => {
    const env = { ...process.env };
    if (value === undefined) delete env.SESSION_TTL_MS; else env.SESSION_TTL_MS = value;
    return Number(execFileSync(process.execPath, ['--import', 'tsx/esm', '-e', "import { SESSION_TTL_MS } from './src/auth/service.ts'; console.log(SESSION_TTL_MS)"], { cwd: process.cwd(), env, encoding: 'utf8' }).trim());
  };
  assert.equal(run(), 8 * 60 * 60 * 1000);
  assert.equal(run('not-a-number'), 8 * 60 * 60 * 1000);
  assert.equal(run('1'), 15 * 60 * 1000);
  assert.equal(run(String(9 * 60 * 60 * 1000)), 8 * 60 * 60 * 1000);
});

test('synthetic mode returns HTTP 503 without DB access, while injected currentSession remains usable', async () => {
  const config = { mode: 'synthetic', databaseUrl: 'postgresql://localhost/test', port: 1, shutdownTimeoutMs: 1000, allowedOrigins: ['https://client.test'], rateLimitMax: 100, rateLimitWindowMs: 60_000 } as RuntimeConfig;
  const app = express();
  app.use(express.json());
  app.use('/api/v1', v1Cors(config));
  app.use('/api/v1', createCsrfProtection());
  app.use('/api/v1/auth/egov', createEgovAuthRouter(config));
  const listener = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${(listener.address() as { port: number }).port}/api/v1/auth/egov/exchange`, {
      method: 'POST',
      headers: { origin: 'https://client.test', 'content-type': 'application/json', cookie: 'ebuhay_csrf=csrf', 'x-csrf-token': 'csrf' },
      body: JSON.stringify({ exchange_code: 'x', invitation_token: 'y' })
    });
    assert.equal(response.status, 503);
  } finally {
    await new Promise<void>((resolve) => listener.close(() => resolve()));
  }
  const fake = sessionExecutor([{ id: 's1', token_hash: hash('b'.repeat(43)), created_at: new Date('2029-12-31T23:00:00Z'), last_seen_at: new Date('2029-12-31T23:45:00Z'), expires_at: new Date('2040-01-01'), revoked_at: null }]);
  assert.equal((await currentSession('b'.repeat(43), { executor: fake.executor, now: new Date('2030-01-01') }))?.id, 'acct-1');
});

test('active Citizen session blocks both SSO exchanges and pending confirmation before provider or identity writes', async () => {
  const queries: string[] = [];
  let providerCalls = 0;
  const query = async (sql: string) => {
    queries.push(sql);
    if (sql.startsWith('UPDATE sessions s SET')) return { rowCount: 1, rows: [account()] };
    throw new Error(`Unexpected database operation: ${sql.slice(0, 35)}`);
  };
  setPool({ query, end: async () => {} } as unknown as Pool);
  const config = { mode: 'synthetic', allowedOrigins: ['https://client.test'], egovBaseUrl: 'https://staging.example.test', egovPartnerCode: 'partner', egovPartnerSecret: 'secret' } as RuntimeConfig;
  const providerFetch = async () => { providerCalls++; throw new Error('Provider must not be called'); };
  const app = express();
  app.use(express.json());
  app.use('/api/v1', v1Cors(config));
  app.use('/api/v1/auth/egov', createEgovAuthRouter(config, { providerFetch }));
  app.use('/egovph', createEgovCallbackRouter(config, { providerFetch }));
  const listener = app.listen(0);
  try {
    const base = `http://127.0.0.1:${(listener.address() as { port: number }).port}`;
    const cookie = `ebuhay_session=${'a'.repeat(43)}; ebuhay_egov_pending=pending-cookie`;
    const headers = { origin: 'https://client.test', 'content-type': 'application/json', cookie };
    const exchange = await fetch(`${base}/api/v1/auth/egov/exchange`, { method: 'POST', headers, body: JSON.stringify({ exchange_code: 'widget-code' }) });
    assert.equal(exchange.status, 409);
    assert.equal((await exchange.json() as { error: string }).error, 'session_exists');
    const callback = await fetch(`${base}/egovph/sso?exchange_code=launch-code`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(callback.status, 409);
    assert.equal((await callback.json() as { error: string }).error, 'session_exists');
    const confirm = await fetch(`${base}/api/v1/auth/egov/confirm`, { method: 'POST', headers, body: JSON.stringify({ pendingId: '00000000-0000-4000-8000-000000000001' }) });
    assert.equal(confirm.status, 409);
    assert.equal((await confirm.json() as { error: string }).error, 'session_exists');
    assert.equal(confirm.headers.get('set-cookie'), null);
    assert.equal(providerCalls, 0);
    assert.equal(queries.length, 3);
    assert.ok(queries.every((sql) => sql.startsWith('UPDATE sessions s SET')));
  } finally {
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    await closePool();
  }
});
