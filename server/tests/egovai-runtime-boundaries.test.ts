import assert from 'node:assert/strict';
import test from 'node:test';
import type { Pool } from 'pg';
import { createApp } from '../src/app.js';
import { closePool, setPool } from '../src/db/pool.js';
import { resetThrottle } from '../src/middleware/v1-security.js';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import { PUBLIC_EGOVAI_CHOICES } from '../src/services/egovaiPublicFaq.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;
const runtimeEnv = {
  EBUHAY_MODE: 'synthetic',
  DATABASE_URL: 'postgres://runtime-test',
};
const aiEnv = {
  ...runtimeEnv,
  EGOV_AI_BASE_URL: 'https://ai.fixture.test/gateway',
  EGOV_ACCESS_CODE: 'fixture-access-code',
};

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
}

async function listen(app: ReturnType<typeof createApp>) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Server failed to bind locally');
  return { server, base: `http://127.0.0.1:${address.port}` };
}

test.afterEach(async () => {
  restoreEnv();
  globalThis.fetch = originalFetch;
  resetThrottle();
  await closePool();
});

test('eGovAI runtime configuration requires paired HTTPS settings in synthetic mode', () => {
  assert.throws(() => loadRuntimeConfig({ ...runtimeEnv, EGOV_AI_BASE_URL: aiEnv.EGOV_AI_BASE_URL }), /configured together/);
  assert.throws(() => loadRuntimeConfig({ ...runtimeEnv, EGOV_ACCESS_CODE: aiEnv.EGOV_ACCESS_CODE }), /configured together/);
  assert.throws(() => loadRuntimeConfig({ ...aiEnv, EGOV_AI_BASE_URL: 'http://ai.fixture.test' }), /HTTPS/);
  assert.throws(() => loadRuntimeConfig({ ...aiEnv, EBUHAY_MODE: 'production', APPROVED_SERVICE: 'blood', ALLOWED_ORIGINS: 'https://app.fixture.test' }), /synthetic/);
  assert.equal(loadRuntimeConfig(aiEnv).mode, 'synthetic');
});

test('health reports configured staging eGovAI without claiming verification', async () => {
  Object.assign(process.env, aiEnv);
  const running = await listen(createApp({ config: loadRuntimeConfig(aiEnv), databaseCheck: async () => undefined }));
  try {
    const response = await fetch(`${running.base}/api/health`);
    const health = await response.json() as { services: Record<string, string> };
    assert.equal(health.services.eGovAI, 'CONFIGURED_STAGING');
    assert.notEqual(health.services.eGovAI, 'VERIFIED');
  } finally {
    await new Promise<void>((resolve, reject) => running.server.close((error) => error ? reject(error) : resolve()));
  }
});

test('legacy public FAQ throttle rejects the second request before another provider call', async () => {
  Object.assign(process.env, aiEnv);
  const accountId = '00000000-0000-4000-8000-000000000002';
  setPool({
    query: async (statement: string | { text: string }) => {
      const sql = typeof statement === 'string' ? statement : statement.text;
      if (sql.startsWith('UPDATE sessions s SET last_seen_at')) {
        return { rowCount: 1, rows: [{ id: accountId, role: 'citizen', display_name: 'Fixture Citizen', service_scope: [], hospital_id: null }] };
      }
      throw new Error(`Unexpected fake database query: ${sql.slice(0, 80)}`);
    },
    end: async () => {},
  } as unknown as Pool);
  const providerCalls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)) return originalFetch(input, init);
    if (url.href === 'https://ai.fixture.test/gateway/api/v1/egov/integration/token') {
      providerCalls.push(url.href);
      return new Response(JSON.stringify({ access_token: 'fixture-token', expires_in_seconds: 60, credits_total: 10, credits_remaining: 10 }));
    }
    if (url.href === 'https://ai.fixture.test/gateway/api/v1/egov/integration/ai_assistant/generate') {
      providerCalls.push(url.href);
      return new Response(JSON.stringify({ data: 'Public process answer.', session_id: 'fixture-session' }));
    }
    throw new Error('Blocked non-local outbound request');
  };

  const config = loadRuntimeConfig({ ...aiEnv, RATE_LIMIT_MAX: '1', RATE_LIMIT_WINDOW_MS: '60000' });
  const running = await listen(createApp({ config, databaseCheck: async () => undefined }));
  const sendFaq = () => fetch(`${running.base}/api/egov/ai/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie: `ebuhay_session=${'a'.repeat(43)}` },
    body: JSON.stringify({ prompt: PUBLIC_EGOVAI_CHOICES[0], category: 'PH' }),
  });
  try {
    const first = await sendFaq();
    const firstBody = await first.text();
    assert.equal(first.status, 200, firstBody);
    const providerCallsAfterFirst = providerCalls.length;
    assert.equal(providerCallsAfterFirst, 2);

    const limited = await sendFaq();
    assert.equal(limited.status, 429);
    assert.match(await limited.text(), /rate_limited/);
    assert.equal(providerCalls.length, providerCallsAfterFirst);
  } finally {
    await new Promise<void>((resolve, reject) => running.server.close((error) => error ? reject(error) : resolve()));
  }
});
