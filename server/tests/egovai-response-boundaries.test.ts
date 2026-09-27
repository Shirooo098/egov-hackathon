import assert from 'node:assert/strict';
import test from 'node:test';
import { askPublicFaq, PUBLIC_EGOVAI_CHOICES } from '../src/services/egovaiPublicFaq.js';

const config = { baseUrl: 'https://ai.example.test/gateway', accessCode: 'fixture-access-code', mode: 'synthetic' };
const prompt = PUBLIC_EGOVAI_CHOICES[0];

test('public FAQ requires explicit synthetic mode before provider use', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => { calls++; throw new Error('No provider call allowed'); };
  for (const mode of ['', 'production', 'partner-sandbox', 'controlled-live']) {
    await assert.rejects(askPublicFaq(prompt, 'PH', { ...config, mode, fetchImpl }));
  }
  assert.equal(calls, 0);
});

test('public FAQ deadline covers response body parsing', async () => {
  const fetchImpl: typeof fetch = async (_url, init) => {
    const response = new Response('{}');
    response.json = () => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('fixture timeout', 'AbortError')), { once: true });
    });
    return response;
  };
  await assert.rejects(askPublicFaq(prompt, 'PH', { ...config, fetchImpl, timeoutMs: 10 }),
    (error: unknown) => error instanceof Error && error.message === 'Official eGovAI service is currently unavailable. Please retry later.');
});

test('public FAQ does not invent an undocumented credit-cost gate', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls++;
    return new Response(JSON.stringify(calls === 1
      ? { access_token: 'fixture-token', expires_in_seconds: 60, credits_total: 0, credits_remaining: 0 }
      : { data: 'A public process explanation.', session_id: 'fixture-session' }));
  };
  assert.equal((await askPublicFaq(prompt, 'PH', { ...config, fetchImpl })).data, 'A public process explanation.');
  assert.equal(calls, 2);
});
