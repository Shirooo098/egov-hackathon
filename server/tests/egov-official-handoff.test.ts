import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyEgovExchange, EgovProviderError } from '../src/auth/egov-provider.js';
import { createPending, pendingIdentity, confirmPending, cancelPending, PENDING_COOKIE, readCookie } from '../src/auth/egov-citizen.js';
import { setPool, closePool } from '../src/db/pool.js';
import { createEgovAuthRouter, createEgovCallbackRouter } from '../src/routes/egov-auth.js';
import { throttle } from '../src/middleware/v1-security.js';
import { redactV1Response } from '../src/middleware/v1-security.js';
import express from 'express';
import type { Pool } from 'pg';
import type { RuntimeConfig } from '../src/runtime/config.js';

test('official provider exchange uses documented token and profile contracts', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return new Response(JSON.stringify({ access_token: 'provider-token' }), { status: 200 });
    return new Response(JSON.stringify({ status: 200, data: { uniqid: 'citizen/123', first_name: 'Test', last_name: 'Citizen', mobile: '+639171234567' } }), { status: 200 });
  };
  const identity = await verifyEgovExchange({ baseUrl: 'https://staging.example.test', partnerCode: 'partner', partnerSecret: 'secret' }, 'single-use-code', fetchImpl);
  assert.deepEqual(identity, { uniqid: 'citizen/123', displayName: 'Test Citizen', mobile: '+639171234567' });
  assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { partner_code: 'partner', partner_secret: 'secret', exchange_code: 'single-use-code', scope: 'SSO_AUTHENTICATION' });
  assert.equal(calls[1].init?.headers && new Headers(calls[1].init.headers).get('authorization'), 'Bearer provider-token');
  assert.equal(String(calls[1].init?.body), '{}');
});

test('malformed provider identity fails closed', async () => {
  const fetchImpl = async (_url: string | URL, _init?: RequestInit) => new Response(JSON.stringify({ access_token: 'token' }), { status: 200 });
  await assert.rejects(() => verifyEgovExchange({ baseUrl: 'https://staging.example.test', partnerCode: 'partner', partnerSecret: 'secret' }, 'code', fetchImpl), (error: unknown) => error instanceof EgovProviderError && error.code === 'invalid_response');
});

test('known eGov outage remains a safe unavailable response through v1 redaction', async () => {
  const app = express();
  app.use(redactV1Response);
  app.get('/unavailable', (_req, res) => res.status(503).json({ success: false, error: 'egov_unavailable', message: 'Official eGov authentication is unavailable. Please retry.' }));
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/unavailable`);
    assert.equal(response.status, 503);
    assert.equal((await response.json() as { error: string }).error, 'egov_unavailable');
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('confirmation rejects a pending cookie replaced after identity display', async () => {
  const rows = new Map<string, { id: string; name: string }>();
  let writes = 0;
  const query = async (sql: string, values: unknown[] = []) => {
    if (sql.startsWith('INSERT INTO egov_sso_pending')) {
      const id = `00000000-0000-4000-8000-${String(++writes).padStart(12, '0')}`;
      rows.set((values[0] as Buffer).toString('hex'), { id, name: String(values[3]) });
      return { rowCount: 1, rows: [{ id }] };
    }
    if (sql.startsWith('SELECT id,display_name')) {
      const row = rows.get((values[0] as Buffer).toString('hex'));
      return { rowCount: row ? 1 : 0, rows: row ? [{ id: row.id, displayName: row.name }] : [] };
    }
    if (sql.startsWith('SELECT id,exchange_transaction_id')) {
      const row = rows.get((values[0] as Buffer).toString('hex'));
      return { rowCount: row?.id === values[1] ? 1 : 0, rows: row?.id === values[1] ? [row] : [] };
    }
    if (sql.startsWith('UPDATE egov_sso_pending SET consumed_at')) {
      const row = rows.get((values[0] as Buffer).toString('hex'));
      return { rowCount: row?.id === values[1] ? 1 : 0, rows: row?.id === values[1] ? [row] : [] };
    }
    if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rowCount: 0, rows: [] };
    throw new Error(`Unexpected database operation: ${sql.slice(0, 35)}`);
  };
  setPool({ query, connect: async () => ({ query, release() {} }), end: async () => {} } as unknown as Pool);
  try {
    const shown = await createPending({ uniqid: 'A', displayName: 'Person A' }, 'transaction-a');
    const replaced = await createPending({ uniqid: 'B', displayName: 'Person B' }, 'transaction-b');
    const shownCookie = readCookie(shown.setCookie, PENDING_COOKIE);
    const replacedCookie = readCookie(replaced.setCookie, PENDING_COOKIE);
    assert.equal((await pendingIdentity(shownCookie))?.displayName, 'Person A');
    assert.deepEqual(await confirmPending(replacedCookie, shown.pendingId, undefined), { error: 'pending_missing' });
    assert.equal(await cancelPending(replacedCookie, shown.pendingId), false);
    assert.equal(writes, 2);
  } finally { await closePool(); }
});

test('in-app callback is throttled before provider use', async () => {
  const config = { mode: 'synthetic', databaseUrl: 'unused', port: 0, shutdownTimeoutMs: 1000, allowedOrigins: [], rateLimitMax: 1, rateLimitWindowMs: 60_000, egovBaseUrl: 'https://example.test', egovPartnerCode: 'partner', egovPartnerSecret: 'secret' } as RuntimeConfig;
  let providerCalls = 0;
  const app = express();
  app.use('/egovph', throttle(config), createEgovCallbackRouter(config, { providerFetch: async () => { providerCalls++; throw new Error('unexpected'); } }));
  const server = app.listen(0);
  try {
    const port = (server.address() as { port: number }).port;
    const first = await fetch(`http://127.0.0.1:${port}/egovph/sso`);
    assert.equal(first.status, 422);
    const second = await fetch(`http://127.0.0.1:${port}/egovph/sso?exchange_code=untrusted`);
    assert.equal(second.status, 429);
    assert.equal(providerCalls, 0);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test('HTTP exchange shows identity before confirmation and consumes code and pending cookie once', async () => {
  const config = { mode: 'synthetic', databaseUrl: 'unused', port: 0, shutdownTimeoutMs: 1000, allowedOrigins: ['http://localhost:3000'], egovBaseUrl: 'https://example.test', egovPartnerCode: 'partner', egovPartnerSecret: 'secret' } as RuntimeConfig;
  let reserved = false;
  let consumed = false;
  let providerCalls = 0;
  let pendingHash = '';
  let pendingMobile = '';
  let identityMobile = '';
  const pendingId = '00000000-0000-4000-8000-000000000001';
  const accountId = '00000000-0000-4000-8000-000000000002';
  const query = async (sql: string, values: unknown[] = []) => {
    if (sql.startsWith('INSERT INTO egov_exchange_transactions')) {
      if (reserved) return { rowCount: 0, rows: [] };
      reserved = true;
      return { rowCount: 1, rows: [{ id: 'transaction-1' }] };
    }
    if (sql.startsWith('INSERT INTO egov_sso_pending')) {
      pendingHash = (values[0] as Buffer).toString('hex');
      pendingMobile = String(values[4]);
      return { rowCount: 1, rows: [{ id: pendingId }] };
    }
    if (sql.startsWith('SELECT id,display_name')) return { rowCount: 1, rows: [{ id: pendingId, displayName: 'Maria Santos' }] };
    if (sql.startsWith('SELECT id,exchange_transaction_id')) {
      const valid = !consumed && pendingHash === (values[0] as Buffer).toString('hex') && values[1] === pendingId;
      return { rowCount: valid ? 1 : 0, rows: valid ? [{ id: pendingId, exchange_transaction_id: 'transaction-1', uniqid: 'citizen-1', display_name: 'Maria Santos', mobile: pendingMobile }] : [] };
    }
    if (sql.startsWith('SELECT a.id,a.role')) return { rowCount: 0, rows: [] };
    if (sql.startsWith('INSERT INTO accounts')) return { rowCount: 1, rows: [{ id: accountId, role: 'citizen', display_name: 'Maria Santos' }] };
    if (sql.startsWith('INSERT INTO egov_identities')) identityMobile = (JSON.parse(String(values[2])) as { mobile: string }).mobile;
    if (sql.startsWith('UPDATE egov_sso_pending SET consumed_at')) consumed = true;
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK' || sql.startsWith('SELECT pg_advisory_xact_lock') || sql.startsWith('UPDATE egov_exchange_transactions') || sql.startsWith('INSERT INTO egov_identities') || sql.startsWith('INSERT INTO sessions') || sql.startsWith('UPDATE egov_sso_pending') || sql.startsWith('UPDATE notification_preferences') || sql.startsWith('INSERT INTO egov_verification_history')) return { rowCount: 1, rows: [] };
    throw new Error(`Unexpected database operation: ${sql.slice(0, 35)}`);
  };
  setPool({ query, connect: async () => ({ query, release() {} }), end: async () => {} } as unknown as Pool);
  const providerFetch = async () => {
    providerCalls++;
    return providerCalls % 2 === 1
      ? new Response(JSON.stringify({ access_token: 'server-token' }), { status: 200 })
      : new Response(JSON.stringify({ status: 200, data: { uniqid: 'citizen-1', first_name: 'Maria', last_name: 'Santos', mobile: '+639171234567' } }), { status: 200 });
  };
  const app = express();
  app.use(express.json());
  app.use('/api/v1/auth/egov', createEgovAuthRouter(config, { providerFetch }));
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/auth/egov`;
    const headers = { origin: 'http://localhost:3000', 'content-type': 'application/json' };
    const exchange = await fetch(`${base}/exchange`, { method: 'POST', headers, body: JSON.stringify({ exchange_code: 'once' }) });
    assert.equal(exchange.status, 200);
    const body = await exchange.json() as { data: { pendingId: string; displayName: string } };
    assert.equal(body.data.displayName, 'Maria Santos');
    assert.equal(exchange.headers.get('set-cookie')?.includes(`${PENDING_COOKIE}=`), true);
    assert.equal(exchange.headers.get('set-cookie')?.includes('ebuhay_session='), false);
    const cookie = exchange.headers.get('set-cookie')!.split(';')[0];
    const pending = await fetch(`${base}/pending`, { headers: { cookie } });
    assert.equal((await pending.json() as { data: { pendingId: string } }).data.pendingId, body.data.pendingId);
    const confirmed = await fetch(`${base}/confirm`, { method: 'POST', headers: { ...headers, cookie }, body: JSON.stringify({ pendingId: body.data.pendingId }) });
    assert.equal(confirmed.status, 200);
    assert.equal(identityMobile, '+639171234567');
    assert.equal(exchange.headers.get('set-cookie')?.includes('server-token'), false);
    assert.equal(confirmed.headers.get('set-cookie')?.includes('ebuhay_session='), true);
    const again = await fetch(`${base}/confirm`, { method: 'POST', headers: { ...headers, cookie }, body: JSON.stringify({ pendingId: body.data.pendingId }) });
    assert.equal(again.status, 422);
    const replay = await fetch(`${base}/exchange`, { method: 'POST', headers, body: JSON.stringify({ exchange_code: 'once' }) });
    assert.equal(replay.status, 409);
    assert.equal(providerCalls, 2);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); await closePool(); }
});

test('official in-app callback redirects to pending confirmation without a session', async () => {
  const config = { mode: 'synthetic', databaseUrl: 'unused', port: 0, shutdownTimeoutMs: 1000, allowedOrigins: [], egovBaseUrl: 'https://example.test', egovPartnerCode: 'partner', egovPartnerSecret: 'secret' } as RuntimeConfig;
  const query = async (sql: string) => {
    if (sql.startsWith('INSERT INTO egov_exchange_transactions')) return { rowCount: 1, rows: [{ id: 'transaction-1' }] };
    if (sql.startsWith('INSERT INTO egov_sso_pending')) return { rowCount: 1, rows: [{ id: '00000000-0000-4000-8000-000000000001' }] };
    if (sql.startsWith('UPDATE egov_exchange_transactions')) return { rowCount: 1, rows: [] };
    throw new Error(`Unexpected database operation: ${sql.slice(0, 35)}`);
  };
  setPool({ query, end: async () => {} } as unknown as Pool);
  let calls = 0;
  const providerFetch = async () => ++calls === 1
    ? new Response(JSON.stringify({ access_token: 'private-token' }), { status: 200 })
    : new Response(JSON.stringify({ status: 200, data: { uniqid: 'citizen-1', first_name: 'Maria', last_name: 'Santos' } }), { status: 200 });
  const app = express();
  app.use('/egovph', createEgovCallbackRouter(config, { providerFetch }));
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/egovph/sso?exchange_code=one-time-code`, { redirect: 'manual' });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), '/onboarding');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('set-cookie')?.includes(`${PENDING_COOKIE}=`), true);
    assert.equal(response.headers.get('set-cookie')?.includes('ebuhay_session='), false);
    assert.doesNotMatch(await response.text(), /one-time-code|private-token/);
    assert.equal(calls, 2);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); await closePool(); }
});

test('returning Citizen refreshes verified mobile and revokes consent for a changed destination', async () => {
  const accountId = '00000000-0000-4000-8000-000000000002';
  const pendingId = '00000000-0000-4000-8000-000000000003';
  let profileMobile = '';
  let consentReset = false;
  const query = async (sql: string, values: unknown[] = []) => {
    if (sql.startsWith('SELECT id,exchange_transaction_id')) return { rowCount: 1, rows: [{ id: pendingId, exchange_transaction_id: 'transaction-2', uniqid: 'citizen-1', display_name: 'Maria Newname', mobile: '+639171234567' }] };
    if (sql.startsWith('SELECT a.id,a.role')) return { rowCount: 1, rows: [{ id: accountId, role: 'citizen', status: 'active', display_name: 'Maria Oldname' }] };
    if (sql.startsWith('UPDATE egov_identities SET profile')) profileMobile = (JSON.parse(String(values[0])) as { mobile: string }).mobile;
    if (sql.startsWith('UPDATE notification_preferences')) {
      assert.match(sql, /phone_number IS DISTINCT FROM \$2/);
      assert.equal(values[1], '+639171234567');
      consentReset = true;
    }
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql.startsWith('SELECT pg_advisory_xact_lock') || sql.startsWith('UPDATE egov_identities') || sql.startsWith('UPDATE accounts') || sql.startsWith('UPDATE notification_preferences') || sql.startsWith('INSERT INTO sessions') || sql.startsWith('UPDATE egov_sso_pending') || sql.startsWith('UPDATE egov_exchange_transactions') || sql.startsWith('INSERT INTO egov_verification_history')) return { rowCount: 1, rows: [] };
    throw new Error(`Unexpected database operation: ${sql.slice(0, 35)}`);
  };
  setPool({ query, connect: async () => ({ query, release() {} }), end: async () => {} } as unknown as Pool);
  try {
    const result = await confirmPending('pending-cookie', pendingId, undefined);
    assert.equal('account' in result ? result.account?.displayName : '', 'Maria Newname');
    assert.equal(profileMobile, '+639171234567');
    assert.equal(consentReset, true);
  } finally { await closePool(); }
});
