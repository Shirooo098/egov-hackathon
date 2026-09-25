import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { setPool, closePool } from '../src/db/pool.js';
import egovRouter from '../src/routes/egov.js';
import * as eGovAI from '../src/services/eGovAIService.js';
import type { RuntimeConfig } from '../src/runtime/config.js';
import type { Pool } from 'pg';

const testConfig = {
  mode: 'synthetic',
  databaseUrl: 'postgres://ticket-02.test/unused',
  port: 1,
  shutdownTimeoutMs: 1000,
  allowedOrigins: ['https://client.test'],
  rateLimitMax: 100,
  rateLimitWindowMs: 60_000,
} as RuntimeConfig;

test('Issue 02: Legacy eVerify routes are completely removed and fall through to 404 with no outbound calls', async () => {
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
    const emptyVerify = await fetch(`${base}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(emptyVerify.status, 404);

    const verifyRes = await fetch(`${base}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ first_name: 'A', last_name: 'B', birth_date: '1990-01-01' }),
    });
    assert.equal(verifyRes.status, 404);

    const qrRes = await fetch(`${base}/api/auth/verify/qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_value: 'dummy' }),
    });
    assert.equal(qrRes.status, 404);

    assert.deepEqual(outboundCalls, []);
  } finally {
    globalThis.fetch = nativeFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Issue 02: Face Liveness routes return 503 capability_deferred with retry guidance', async () => {
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
    const sessionBody = (await sessionRes.json()) as { error?: string; retryable?: boolean; retry_guidance?: string };
    assert.equal(sessionBody.error, 'capability_deferred');
    assert.equal(sessionBody.retryable, true);
    assert.ok(typeof sessionBody.retry_guidance === 'string');

    const resultRes = await fetch(`${base}/api/egov/liveness/result/any-token`);
    assert.equal(resultRes.status, 503);
    const resultBody = (await resultRes.json()) as { error?: string; retryable?: boolean };
    assert.equal(resultBody.error, 'capability_deferred');
    assert.equal(resultBody.retryable, true);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Issue 05 and 06: eGovAI service truthfully fails closed without mock laws or scheduling', async () => {
  assert.equal('DEMO_MODE' in eGovAI, false);

  await assert.rejects(
    () => eGovAI.askLawsAndRegulations('What is the law on organ donation?'),
    (err: unknown) => {
      const error = err as { status?: number; code?: string; retryable?: boolean };
      assert.equal(error.status, 503);
      assert.equal(error.code, 'capability_deferred');
      assert.equal(error.retryable, true);
      return true;
    }
  );

  await assert.rejects(
    () => eGovAI.generateScheduleSlots({ urgencyLevel: 'urgent' }),
    (err: unknown) => {
      const error = err as { status?: number; code?: string };
      assert.equal(error.status, 503);
      assert.equal(error.code, 'capability_deferred');
      return true;
    }
  );

  await assert.rejects(
    () => eGovAI.getAIToken(),
    (err: unknown) => {
      const error = err as { status?: number; code?: string };
      assert.equal(error.status, 503);
      assert.equal(error.code, 'capability_deferred');
      return true;
    }
  );
});

test('Issue 05 and 06: eGovAI HTTP endpoint returns 503 capability_deferred with retry guidance', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/egov', egovRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  try {
    const unsupportedChat = await fetch(`${base}/api/egov/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'What is my eligibility for a transplant?' }),
    });
    assert.equal(unsupportedChat.status, 400);

    const chatRes = await fetch(`${base}/api/egov/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'How does eBuhay coordination work?' }),
    });
    assert.equal(chatRes.status, 503);
    const chatBody = (await chatRes.json()) as { error?: string; code?: string; retryable?: boolean; retry_guidance?: string };
    assert.equal(chatBody.error, 'capability_deferred');
    assert.equal(chatBody.code, 'capability_deferred');
    assert.equal(chatBody.retryable, true);
    assert.ok(typeof chatBody.retry_guidance === 'string');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Issue 06: synthetic runtime has no free-text laws API', async () => {
  setPool({
    query: async (statement: string) => {
      assert.match(statement, /UPDATE sessions s SET last_seen_at/);
      return { rowCount: 1, rows: [{ id: '00000000-0000-4000-8000-000000000001', role: 'citizen', display_name: 'Test', service_scope: [], hospital_id: null }] };
    },
    end: async () => {},
  } as unknown as Pool);
  const server = createServer(createApp({ config: testConfig }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  try {
    const csrfResponse = await fetch(`${base}/api/v1/auth/csrf`, { headers: { origin: 'https://client.test' } });
    const csrf = (await csrfResponse.json() as { data: { csrfToken: string } }).data.csrfToken;
    const csrfCookie = csrfResponse.headers.get('set-cookie')?.split(';')[0];
    assert.ok(csrfCookie);
    for (const path of ['/api/egovai/laws', '/api/v1/egovai/laws']) {
      const response: Response = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: { origin: 'https://client.test', 'content-type': 'application/json', cookie: `ebuhay_session=${'a'.repeat(43)}; ${csrfCookie}`, 'x-csrf-token': csrf },
        body: JSON.stringify({ prompt: 'Give me clinical advice about my case' }),
      });
      assert.equal(response.status, 404, path);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closePool();
  }
});

test('Issue 06: eGovAI HTTP endpoint rejects requests carrying extra data or invalid category while allowing curated prompt with PH', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/egov', egovRouter);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  try {
    const validPrompt = 'How does eBuhay coordination work?';

    const prohibitedPayloads = [
      { prompt: validPrompt, case_id: 'case-001' },
      { prompt: validPrompt, identity: { id: 'user-001' } },
      { prompt: validPrompt, donor_id: 'donor-001' },
      { prompt: validPrompt, recipient_id: 'recip-001' },
      { prompt: validPrompt, clinical_data: { diagnosis: 'renal' } },
      { prompt: validPrompt, match_id: 'match-001' },
      { prompt: validPrompt, appointment_id: 'apt-001' },
      { prompt: validPrompt, arbitrary_key: 'unexpected' },
      { prompt: validPrompt, category: 'US' },
    ];

    for (const payload of prohibitedPayloads) {
      const res = await fetch(`${base}/api/egov/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      assert.equal(res.status, 400, `Expected 400 for payload with extra/invalid key: ${JSON.stringify(payload)}`);
      const body = (await res.json()) as { success?: boolean; message?: string };
      assert.equal(body.success, false);
    }

    const clientRes = await fetch(`${base}/api/egov/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: validPrompt, category: 'PH' }),
    });
    assert.equal(clientRes.status, 503);
    const clientBody = (await clientRes.json()) as { error?: string; code?: string; retryable?: boolean; retry_guidance?: string };
    assert.equal(clientBody.error, 'capability_deferred');
    assert.equal(clientBody.code, 'capability_deferred');
    assert.equal(clientBody.retryable, true);
    assert.ok(typeof clientBody.retry_guidance === 'string');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Issues 01 and 07: unmatched callback and unknown path cannot expose an exchange code', async () => {
  const server = createServer(createApp({ config: testConfig }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const logs: string[] = [];
  const original = console.log;
  console.log = (value?: unknown) => logs.push(String(value));
  try {
    const code = 'exchange-code-canary-789';
    const response = await fetch(`${base}/egovph/missing?exchange_code=${code}`);
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /exchange-code-canary-789|egovph\/missing/);
    await fetch(`${base}/unknown-path-canary/arbitrary`);
    assert.doesNotMatch(logs.join('\n'), /exchange-code-canary-789|unknown-path-canary|egovph\.missing/);
    assert.match(logs.join('\n'), /"route":"unknown"/);
  } finally {
    console.log = original;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Issue 07: malformed JSON cannot put request content in error logs', async () => {
  const server = createServer(createApp({ config: testConfig }));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const logs: string[] = [];
  const original = console.error;
  console.error = (value?: unknown) => logs.push(String(value));
  try {
    const response = await fetch(`${base}/api/v1/auth/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://client.test' },
      body: '{"secret": json-body-canary-123}',
    });
    assert.equal(response.status, 400);
    assert.doesNotMatch(await response.text(), /json-body-canary-123/);
    assert.equal(logs.length, 1);
    assert.doesNotMatch(logs[0], /json-body-canary-123|causeMessage|causeDetail|"detail"/);
    const logged = JSON.parse(logs[0]) as { requestId?: string; route?: string; status?: number };
    assert.ok(logged.requestId);
    assert.equal(logged.route, 'api.v1');
    assert.equal(logged.status, 400);
  } finally {
    console.error = original;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
