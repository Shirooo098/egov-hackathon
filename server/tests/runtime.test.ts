import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMainModule, loadRuntimeConfig, isServiceAllowed, redactedErrorMessage, RuntimeConfigError, type RuntimeConfig } from '../src/runtime/config.js';
import { createApp } from '../src/app.js';
import { withDeadline } from '../src/runtime/shutdown.js';
import { startWorker } from '../src/worker.js';

const env = {
  EBUHAY_MODE: 'synthetic',
  DATABASE_URL: 'postgres://runtime-test',
  EGOV_BASE_URL: 'https://egov.test',
  EGOV_PARTNER_CODE: 'partner',
  EGOV_PARTNER_SECRET: 'secret',
};

test('runtime configuration requires a supported mode and database URL', () => {
  assert.equal(loadRuntimeConfig(env).mode, 'synthetic');
  assert.throws(() => loadRuntimeConfig({ ...env, EBUHAY_MODE: 'unsafe' }), /EBUHAY_MODE/);
  assert.throws(() => loadRuntimeConfig({ EBUHAY_MODE: 'synthetic' }), /DATABASE_URL/);
  assert.throws(() => loadRuntimeConfig({ ...env, DATABASE_DIRECT_URL: 'not-a-url' }), /DATABASE_DIRECT_URL/);
  assert.throws(() => loadRuntimeConfig({ ...env, PORT: 'not-a-number' }), /PORT/);
  assert.throws(() => loadRuntimeConfig({ ...env, TEST_DATABASE_URL: env.DATABASE_URL }), /isolated/);
  assert.throws(() => loadRuntimeConfig({ ...env, ALLOWED_ORIGINS: 'not-an-origin' }), /ALLOWED_ORIGINS/);
  assert.throws(() => loadRuntimeConfig({ ...env, EBUHAY_MODE: 'controlled-live', APPROVED_SERVICE: 'blood' }), /ALLOWED_ORIGINS/);
  assert.throws(() => loadRuntimeConfig({ ...env, EBUHAY_MODE: 'production', APPROVED_SERVICE: 'blood', ALLOWED_ORIGINS: 'http://localhost:3000' }), /non-local HTTPS/);
  assert.throws(() => loadRuntimeConfig({ ...env, EBUHAY_MODE: 'production', APPROVED_SERVICE: 'blood', ALLOWED_ORIGINS: 'https://example.test/path' }), /ALLOWED_ORIGINS/);
  assert.throws(() => loadRuntimeConfig({ ...env, EBUHAY_MODE: 'production', ALLOWED_ORIGINS: 'https://example.test' }), /APPROVED_SERVICE/);
  assert.equal(loadRuntimeConfig({ ...env, EBUHAY_MODE: 'production', APPROVED_SERVICE: 'blood', ALLOWED_ORIGINS: 'https://example.test' }).approvedService, 'blood');
});

test('process error messages exclude arbitrary provider and database secrets', () => {
  assert.equal(redactedErrorMessage(new RuntimeConfigError('EGOV_BASE_URL must be an HTTPS URL')), 'EGOV_BASE_URL must be an HTTPS URL');
  for (const value of ['invalid', '', ' ']) {
    let invalidPoolError: unknown;
    try { loadRuntimeConfig({ ...env, DB_POOL_MAX: value }); } catch (error) { invalidPoolError = error; }
    assert.equal(redactedErrorMessage(invalidPoolError), 'DB_POOL_MAX must be a positive integer');
  }
  const canary = 'Bearer secret-token exchange_code=secret-code postgres://user:secret@db.test';
  assert.equal(redactedErrorMessage(new Error(canary)), 'Runtime startup failed');
  assert.equal(redactedErrorMessage(canary), 'Runtime startup failed');
});

test('enabled official SMS and Chain providers require complete HTTPS startup configuration', () => {
  assert.throws(() => loadRuntimeConfig({ ...env, EMESSAGE_BASE_URL: 'https://sms.test' }), /EMESSAGE_API_TOKEN/);
  assert.throws(() => loadRuntimeConfig({ ...env, EMESSAGE_API_TOKEN: 'token' }), /EMESSAGE_BASE_URL/);
  assert.throws(() => loadRuntimeConfig({ ...env, EMESSAGE_BASE_URL: 'http://sms.test', EMESSAGE_API_TOKEN: 'token' }), /EMESSAGE_BASE_URL.*HTTPS/);
  assert.doesNotThrow(() => loadRuntimeConfig({ ...env, EMESSAGE_BASE_URL: 'https://sms.test', EMESSAGE_API_TOKEN: 'token' }));

  const chain = { ...env, EGOVCHAIN_MODE: 'staging', EGOVCHAIN_RPC_BASE_URL: 'https://rpc.test/egovchain', EGOVCHAIN_RPC_TOKEN: 'token' };
  assert.throws(() => loadRuntimeConfig({ ...chain, EGOVCHAIN_RPC_TOKEN: '' }), /EGOVCHAIN_RPC_TOKEN/);
  assert.throws(() => loadRuntimeConfig({ ...chain, EGOVCHAIN_RPC_BASE_URL: 'http://rpc.test' }), /EGOVCHAIN_RPC_BASE_URL.*HTTPS/);
  assert.throws(() => loadRuntimeConfig({ ...chain, EGOVCHAIN_MODE: ' staging ' }), /EGOVCHAIN_MODE/);
  assert.throws(() => loadRuntimeConfig({ ...chain, EGOVCHAIN_RPC_TOKEN: ` ${chain.EGOVCHAIN_RPC_TOKEN}` }), /surrounding whitespace/);
  assert.throws(() => loadRuntimeConfig({ ...chain, EBUHAY_MODE: 'production', APPROVED_SERVICE: 'blood', ALLOWED_ORIGINS: 'https://app.test' }), /EGOVCHAIN_MODE/);
  assert.doesNotThrow(() => loadRuntimeConfig(chain));
});

test('live mode blocks mixed legacy surfaces before handlers, including generic and nested kidney requests', async () => {
  const config = { mode: 'production', databaseUrl: 'postgres://secret', approvedService: 'blood' } as RuntimeConfig;
  const running = await listen(createApp({ config, databaseCheck: async () => undefined }));
  try {
    const generic = await fetch(`${running.base}/api/services`);
    const nested = await fetch(`${running.base}/api/platform/cases`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ service: 'living-kidney' }) });
    const canonicalIntake = await fetch(`${running.base}/api/episodes/00000000-0000-4000-8000-000000000000/intake`);
    const appointments = await fetch(`${running.base}/api/appointments/requests`);
    const events = await fetch(`${running.base}/api/simulated-hospital/events`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const mixedCase = await fetch(`${running.base}/API/PLATFORM/services`);
    assert.equal(generic.status, 404);
    assert.equal(nested.status, 404);
    assert.equal(canonicalIntake.status, 404);
    assert.equal(appointments.status, 404);
    assert.equal(events.status, 404);
    assert.equal(mixedCase.status, 404);
  } finally {
    await new Promise<void>((resolve) => running.server.close(() => resolve()));
  }
});

test('entrypoint detection resolves Windows paths with spaces', () => {
  const file = resolve(process.cwd(), 'folder with spaces', '..', 'src', 'start.ts');
  assert.equal(isMainModule(pathToFileURL(file).href, file), true);
});

test('shutdown deadline resolves stalled cleanup without leaving a timer handle', async () => {
  let forced = false;
  const started = Date.now();
  await withDeadline(() => new Promise<void>(() => undefined), 20, () => { forced = true; });
  assert.equal(forced, true);
  assert.ok(Date.now() - started < 1000);
});

test('live modes allow blood only and synthetic mode retains the contract double', () => {
  assert.equal(isServiceAllowed('controlled-live', 'blood'), true);
  assert.equal(isServiceAllowed('production', 'living-kidney'), false);
  assert.equal(isServiceAllowed('synthetic', 'deceased-kidney'), true);
});

async function listen(app: ReturnType<typeof createApp>) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('server did not bind');
  return { server, base: `http://127.0.0.1:${address.port}` };
}

test('liveness is independent from database readiness and readiness redacts dependency details', async () => {
  const config = { mode: 'synthetic', databaseUrl: 'postgres://secret' } as RuntimeConfig;
  const running = await listen(createApp({ config, databaseCheck: async () => { throw new Error('postgres://secret'); } }));
  try {
    const live = await fetch(`${running.base}/health/live`);
    const ready = await fetch(`${running.base}/health/ready`);
    assert.equal(live.status, 200);
    assert.equal(ready.status, 503);
    assert.doesNotMatch(await ready.text(), /postgres:\/\/secret/);
  } finally {
    await new Promise<void>((resolve) => running.server.close(() => resolve()));
  }
});

test('injected configs without origins deny hostile CORS while serving no-origin traffic', async () => {
  const config = { mode: 'synthetic', databaseUrl: 'postgres://secret' } as RuntimeConfig;
  const running = await listen(createApp({ config, databaseCheck: async () => undefined }));
  try {
    const hostile = await fetch(`${running.base}/health/live`, { headers: { origin: 'https://hostile.example' } });
    const local = await fetch(`${running.base}/health/live`);
    assert.equal(hostile.status, 200);
    assert.equal(hostile.headers.get('access-control-allow-origin'), null);
    assert.equal(local.status, 200);
  } finally {
    await new Promise<void>((resolve) => running.server.close(() => resolve()));
  }
});

test('worker starts with injected dependencies and closes after stop', async () => {
  let checks = 0;
  let closes = 0;
  const worker = await startWorker({
    config: { mode: 'synthetic', databaseUrl: 'postgres://runtime-test', shutdownTimeoutMs: 100 } as RuntimeConfig,
    check: async () => { checks += 1; },
    close: async () => { closes += 1; },
    intervalMs: 5
  });
  await new Promise((resolve) => setTimeout(resolve, 15));
  await worker.stop();
  assert.ok(checks >= 1);
  assert.equal(closes, 1);
});
