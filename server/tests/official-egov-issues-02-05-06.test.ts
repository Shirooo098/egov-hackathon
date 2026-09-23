import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import egovRouter from '../src/routes/egov.js';
import * as eGovAI from '../src/services/eGovAIService.js';
import type { RuntimeConfig } from '../src/runtime/config.js';

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
    const emptyChat = await fetch(`${base}/api/egov/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    assert.equal(emptyChat.status, 400);

    const chatRes = await fetch(`${base}/api/egov/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'What are the donation procedures?' }),
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
