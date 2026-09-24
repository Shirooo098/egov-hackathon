import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import matchRouter from '../src/routes/match.js';
import egovRouter from '../src/routes/egov.js';
import type { RuntimeConfig } from '../src/runtime/config.js';
import { INITIAL_DEMO_MATCH } from '../../client/src/context/matchHelpers.js';

const testConfig = {
  mode: 'synthetic',
  databaseUrl: 'postgres://ticket-02.test/unused',
  port: 1,
  shutdownTimeoutMs: 1000,
  allowedOrigins: ['https://client.test'],
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
} as RuntimeConfig;

test('Ticket 02: Legacy eVerify HTTP endpoints fail closed with 404 and make no outbound calls', async () => {
  const nativeFetch = globalThis.fetch;
  const outboundCalls: string[] = [];
  globalThis.fetch = (async (input: unknown, init?: unknown) => {
    const url = String(input);
    if (url.startsWith('http://127.0.0.1:')) {
      return nativeFetch(input as RequestInfo, init as RequestInit);
    }
    outboundCalls.push(url);
    throw new Error(`Unexpected outbound network request to ${url}`);
  }) as typeof fetch;

  const app = createApp({ config: testConfig });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  try {
    // Legacy /api/auth/verify on full app falls through to 404
    const resVerify = await fetch(`${base}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'Juan', last_name: 'Dela Cruz', birth_date: '1990-01-01' }),
    });
    assert.equal(resVerify.status, 404);
    const bodyVerify = (await resVerify.json()) as { success?: boolean; message?: string };
    assert.equal(bodyVerify.success, false);

    // Legacy /api/auth/verify/qr on full app falls through to 404
    const resQr = await fetch(`${base}/api/auth/verify/qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_value: 'dummy-qr' }),
    });
    assert.equal(resQr.status, 404);
    const bodyQr = (await resQr.json()) as { success?: boolean; message?: string };
    assert.equal(bodyQr.success, false);

    // GET requests on legacy verify endpoints also fail closed with 404
    const resGetVerify = await fetch(`${base}/api/auth/verify`);
    assert.equal(resGetVerify.status, 404);

    // /api/v1/auth/verify also falls through to 404
    const resV1Verify = await fetch(`${base}/api/v1/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://client.test',
        Cookie: 'ebuhay_csrf=test-csrf',
        'x-csrf-token': 'test-csrf',
      },
      body: JSON.stringify({ first_name: 'Juan' }),
    });
    assert.equal(resV1Verify.status, 404);

    // Zero outbound provider calls were attempted
    assert.deepEqual(outboundCalls, []);
  } finally {
    globalThis.fetch = nativeFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Ticket 02: /api/health reports official integration configuration without simulated success', async () => {
  const keys = ['EBUHAY_MODE', 'EMESSAGE_BASE_URL', 'EMESSAGE_API_TOKEN', 'EGOVCHAIN_MODE', 'EGOVCHAIN_RPC_BASE_URL', 'EGOVCHAIN_RPC_TOKEN', 'EGOVCHAIN_SIGNER_PRIVATE_KEY'] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const app = createApp({ config: testConfig });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  try {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { services?: Record<string, unknown> };
    assert.ok(body.services);
    assert.equal('eVerify' in body.services, false);
    assert.ok('eMessage' in body.services);
    assert.ok('eGovAI' in body.services);
    assert.equal('BesuBlockchain' in body.services, false);
    assert.equal(body.services.eGovChain, 'UNAVAILABLE');
    assert.equal(body.services.eGovAI, 'UNAVAILABLE');
    assert.equal(body.services.eMessage, 'UNAVAILABLE');
    Object.assign(process.env, {
      EBUHAY_MODE: 'synthetic', EMESSAGE_BASE_URL: 'https://sms.test', EMESSAGE_API_TOKEN: 'test-token',
      EGOVCHAIN_MODE: 'staging', EGOVCHAIN_RPC_BASE_URL: 'https://chain.test', EGOVCHAIN_RPC_TOKEN: 'test-token',
      EGOVCHAIN_SIGNER_PRIVATE_KEY: '0x' + '1'.repeat(64),
    });
    const configured = (await (await fetch(`${base}/api/health`)).json()) as { services: Record<string, unknown> };
    assert.equal(configured.services.eMessage, 'CONFIGURED_STAGING');
    assert.equal(configured.services.eGovChain, 'CONFIGURED_STAGING');
    assert.equal(configured.services.eGovAI, 'UNAVAILABLE');
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Ticket 02: Match fixtures and match API do not claim eVerify verified status', async () => {
  const app = express();
  app.use('/api/matches', matchRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  try {
    const res = await fetch(`${base}/api/matches/find?request_type=organ&blood_type_needed=A%2B&organ_needed=kidney`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { data?: { matches?: Array<{ donor?: Record<string, unknown> }> } };
    assert.ok(body.data?.matches && body.data.matches.length > 0);
    for (const match of body.data.matches) {
      assert.equal(match.donor?.everify_status, undefined);
    }

    // Client fixture INITIAL_DEMO_MATCH does not claim eVerify verified status or PCN
    assert.equal((INITIAL_DEMO_MATCH.donor as Record<string, unknown>).everify_status, undefined);
    assert.equal((INITIAL_DEMO_MATCH.donor as Record<string, unknown>).everify_tier, undefined);
    assert.equal((INITIAL_DEMO_MATCH.donor as Record<string, unknown>).philsys_pcn, undefined);
    assert.equal((INITIAL_DEMO_MATCH.recipient as Record<string, unknown>).everify_status, undefined);
    assert.equal((INITIAL_DEMO_MATCH.recipient as Record<string, unknown>).everify_tier, undefined);
    assert.equal((INITIAL_DEMO_MATCH.recipient as Record<string, unknown>).philsys_pcn, undefined);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Ticket 02: Face Liveness remains 503 unavailable without fabricated sessions or scores', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/egov', egovRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  try {
    const sessionRes = await fetch(`${base}/api/egov/liveness/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_url: 'https://app.test/callback' }),
    });
    assert.equal(sessionRes.status, 503);
    const sessionBody = (await sessionRes.json()) as { error?: string; retryable?: boolean; session_token?: string };
    assert.equal(sessionBody.error, 'capability_deferred');
    assert.equal(sessionBody.session_token, undefined);

    const resultRes = await fetch(`${base}/api/egov/liveness/result/any-token`);
    assert.equal(resultRes.status, 503);
    const resultBody = (await resultRes.json()) as { error?: string; confidence_score?: number; passed?: boolean };
    assert.equal(resultBody.error, 'capability_deferred');
    assert.equal(resultBody.confidence_score, undefined);
    assert.equal(resultBody.passed, undefined);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
