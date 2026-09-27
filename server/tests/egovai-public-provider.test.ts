import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { createServer } from 'node:http';
import { createEgovRouter } from '../src/routes/egov.js';
import { askPublicFaq, PUBLIC_EGOVAI_CHOICES } from '../src/services/egovaiPublicFaq.js';
import * as eGovAIService from '../src/services/eGovAIService.js';

const VALID_PROMPT = PUBLIC_EGOVAI_CHOICES[0];
const BASE_HTTPS = 'https://egovai.test/gateway';

function mockSuccessFetch(calls: Array<{ url: string; headers: Headers; body: string }>) {
  return async (input: unknown, init?: RequestInit): Promise<Response> => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    assert.equal(init?.redirect, 'error');
    assert.ok(init?.signal);
    const body = String(init?.body ?? '');
    calls.push({ url, headers, body });

    if (url.endsWith('/api/v1/egov/integration/token')) {
      return new Response(
        JSON.stringify({
          access_token: 'secret-access-token-xyz',
          expires_in_seconds: 28800,
          credits_total: 200,
          credits_remaining: 150,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.endsWith('/api/v1/egov/integration/ai_assistant/generate')) {
      return new Response(
        JSON.stringify({
          data: 'Official public process explanation for eBuhay.',
          session_id: 'secret-session-abc-123',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('Not found', { status: 404 });
  };
}

test('eGovAI provider: fixture HTTP success returns sanitized informational response preserving base path', async () => {
  const calls: Array<{ url: string; headers: Headers; body: string }> = [];
  const fetchImpl = mockSuccessFetch(calls) as typeof fetch;

  const app = express();
  app.use(express.json());
  app.use('/api/egov', createEgovRouter({
    fetchImpl,
    baseUrl: BASE_HTTPS,
    accessCode: 'valid-access-code-123', mode: 'synthetic',
  }));

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  try {
    const res = await fetch(`${base}/api/egov/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: VALID_PROMPT, category: 'PH' }),
    });

    assert.equal(res.status, 200);
    const json = (await res.json()) as Record<string, unknown>;
    assert.deepEqual(json, {
      success: true,
      data: 'Official public process explanation for eBuhay.',
      informational: true,
    });

    // Verify token and session_id never leak to client
    assert.equal('access_token' in json, false);
    assert.equal('session_id' in json, false);

    // Verify correct endpoints and path preservation onto credential base
    assert.equal(calls.length, 2);
    assert.equal(calls[0].url, 'https://egovai.test/gateway/api/v1/egov/integration/token');
    assert.equal(JSON.parse(calls[0].body).access_code, 'valid-access-code-123');

    assert.equal(calls[1].url, 'https://egovai.test/gateway/api/v1/egov/integration/ai_assistant/generate');
    assert.equal(calls[1].headers.get('Authorization'), 'Bearer secret-access-token-xyz');
    assert.deepEqual(JSON.parse(calls[1].body), { prompt: VALID_PROMPT, category: 'PH' });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('eGovAI provider: 400 forbidden data rejected before any upstream fetch', async () => {
  let outboundCount = 0;
  const fetchImpl = (async () => {
    outboundCount++;
    throw new Error('Outbound fetch must not be called');
  }) as typeof fetch;

  const app = express();
  app.use(express.json());
  app.use('/api/egov', createEgovRouter({
    fetchImpl,
    baseUrl: BASE_HTTPS,
    accessCode: 'valid-access-code', mode: 'synthetic',
  }));

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

  const prohibitedBodies = [
    { prompt: 'Tell me a joke' },
    { prompt: VALID_PROMPT, case_id: 'case-123' },
    { prompt: VALID_PROMPT, donor_id: 'donor-123' },
    { prompt: VALID_PROMPT, clinical_data: { match: 'positive' } },
    { prompt: VALID_PROMPT, category: 'US' },
    { prompt: '', category: 'PH' },
    { category: 'PH' },
  ];

  try {
    for (const body of prohibitedBodies) {
      const res = await fetch(`${base}/api/egov/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      assert.equal(res.status, 400);
      const json = (await res.json()) as { success: boolean; message: string };
      assert.equal(json.success, false);
    }
    assert.equal(outboundCount, 0, 'No outbound requests must be made for invalid requests');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('eGovAI provider: malformed token responses return sanitized 503 capability_deferred', async () => {
  const malformedTokenBodies = [
    {}, // missing access_token
    { access_token: '', expires_in_seconds: 3600, credits_total: 10, credits_remaining: 10 },
    { access_token: 'tok', expires_in_seconds: -1, credits_total: 10, credits_remaining: 10 },
    { access_token: 'tok', expires_in_seconds: 0, credits_total: 10, credits_remaining: 10 },
    { access_token: 'tok', expires_in_seconds: 3600, credits_total: -5, credits_remaining: 10 },
    { access_token: 'tok', expires_in_seconds: 3600, credits_total: 10, credits_remaining: -1 },
  ];

  for (const tokenPayload of malformedTokenBodies) {
    const fetchImpl = (async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/token')) {
        return new Response(JSON.stringify(tokenPayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('{}', { status: 200 });
    }) as typeof fetch;

    await assert.rejects(
      () => askPublicFaq(VALID_PROMPT, 'PH', {
        fetchImpl,
        baseUrl: BASE_HTTPS,
        accessCode: 'valid-code', mode: 'synthetic',
      }),
      (err: unknown) => {
        const error = err as { status?: number; code?: string; retryable?: boolean };
        assert.equal(error.status, 503);
        assert.equal(error.code, 'capability_deferred');
        assert.equal(error.retryable, true);
        return true;
      }
    );
  }
});

test('eGovAI provider: malformed answer responses return sanitized 503 capability_deferred', async () => {
  const malformedGenerateBodies = [
    {}, // missing data & session_id
    { data: '', session_id: 'sess-1' }, // empty data
    { data: 12345, session_id: 'sess-1' }, // non-string data
    { data: 'valid answer' }, // missing session_id
    { data: 'valid answer', session_id: '' }, // empty session_id
    { data: 'Echoed token tok', session_id: 'sess-1' },
    { data: 'Echoed access valid-code', session_id: 'sess-1' },
    { data: 'Echoed session sess-1', session_id: 'sess-1' },
  ];

  for (const generatePayload of malformedGenerateBodies) {
    const fetchImpl = (async (input: unknown) => {
      const url = String(input);
      if (url.endsWith('/token')) {
        return new Response(JSON.stringify({ access_token: 'tok', expires_in_seconds: 100, credits_total: 10, credits_remaining: 5 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(generatePayload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    await assert.rejects(
      () => askPublicFaq(VALID_PROMPT, 'PH', {
        fetchImpl,
        baseUrl: BASE_HTTPS,
        accessCode: 'valid-code', mode: 'synthetic',
      }),
      (err: unknown) => {
        const error = err as { status?: number; code?: string };
        assert.equal(error.status, 503);
        assert.equal(error.code, 'capability_deferred');
        return true;
      }
    );
  }
});

test('eGovAI provider: non-2xx, timeout, redirect failures return sanitized 503 without leaking raw bodies', async () => {
  const sensitiveErrorPayload = JSON.stringify({ error: 'internal_secret_provider_token_leak' });

  // 1. Non-2xx on token
  const fetch401 = (async () => new Response(sensitiveErrorPayload, { status: 401 })) as typeof fetch;
  await assert.rejects(
    () => askPublicFaq(VALID_PROMPT, 'PH', { fetchImpl: fetch401, baseUrl: BASE_HTTPS, accessCode: 'code', mode: 'synthetic' }),
    (err: unknown) => {
      const error = err as { message: string; status: number };
      assert.equal(error.status, 503);
      assert.doesNotMatch(error.message, /internal_secret|token_leak/);
      return true;
    }
  );

  // 2. Non-2xx on generate
  const fetch500 = (async (input: unknown) => {
    if (String(input).endsWith('/token')) {
      return new Response(JSON.stringify({ access_token: 'tok', expires_in_seconds: 100, credits_total: 10, credits_remaining: 5 }), { status: 200 });
    }
    return new Response(sensitiveErrorPayload, { status: 500 });
  }) as typeof fetch;
  await assert.rejects(
    () => askPublicFaq(VALID_PROMPT, 'PH', { fetchImpl: fetch500, baseUrl: BASE_HTTPS, accessCode: 'code', mode: 'synthetic' }),
    (err: unknown) => {
      const error = err as { message: string; status: number };
      assert.equal(error.status, 503);
      assert.doesNotMatch(error.message, /internal_secret|token_leak/);
      return true;
    }
  );

  // 3. Timeout / Abort
  const fetchTimeout = (async () => {
    throw new DOMException('The operation was aborted', 'AbortError');
  }) as typeof fetch;
  await assert.rejects(
    () => askPublicFaq(VALID_PROMPT, 'PH', { fetchImpl: fetchTimeout, baseUrl: BASE_HTTPS, accessCode: 'code', mode: 'synthetic' }),
    (err: unknown) => {
      const error = err as { status: number; code: string };
      assert.equal(error.status, 503);
      assert.equal(error.code, 'capability_deferred');
      return true;
    }
  );
});

test('eGovAI provider: URL validation and runtime mode guards reject invalid configurations', async () => {
  const dummyFetch = (async () => new Response('{}')) as typeof fetch;

  await assert.rejects(
    () => askPublicFaq(VALID_PROMPT, 'PH', { fetchImpl: dummyFetch, baseUrl: 'http://insecure.test', accessCode: 'code', mode: 'synthetic' }),
    (err: unknown) => (err as { status: number }).status === 503
  );
  await assert.rejects(
    () => askPublicFaq(VALID_PROMPT, 'PH', { fetchImpl: dummyFetch, baseUrl: 'https://user:pass@host.test', accessCode: 'code', mode: 'synthetic' }),
    (err: unknown) => (err as { status: number }).status === 503
  );
  await assert.rejects(
    () => askPublicFaq(VALID_PROMPT, 'PH', { fetchImpl: dummyFetch, baseUrl: 'https://host.test?query=1', accessCode: 'code', mode: 'synthetic' }),
    (err: unknown) => (err as { status: number }).status === 503
  );
  await assert.rejects(
    () => askPublicFaq(VALID_PROMPT, 'PH', { fetchImpl: dummyFetch, baseUrl: BASE_HTTPS, accessCode: 'code', mode: 'production' }),
    (err: unknown) => (err as { status: number }).status === 503
  );
});

test('eGovAI provider: legacy unsupported paths remain deferred', async () => {
  await assert.rejects(() => eGovAIService.askLawsAndRegulations('Any legal query'), (err: unknown) => (err as { code: string }).code === 'capability_deferred');
  await assert.rejects(() => eGovAIService.generateScheduleSlots({ urgencyLevel: 'critical' }), (err: unknown) => (err as { code: string }).code === 'capability_deferred');
  await assert.rejects(() => eGovAIService.getAIToken(), (err: unknown) => (err as { code: string }).code === 'capability_deferred');
});
