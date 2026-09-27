import assert from 'node:assert/strict';
import test from 'node:test';
import { rpc } from '../src/services/EgovChainService.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function setupStagingEnv() {
  process.env.EBUHAY_MODE = 'synthetic';
  process.env.EGOVCHAIN_MODE = 'staging';
  process.env.EGOVCHAIN_RPC_BASE_URL = 'https://rpc.fixture.test';
  process.env.EGOVCHAIN_RPC_TOKEN = 'fixture-rpc-token';
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test('Chain rejects private or unsupported parameters before any provider fetch', async () => {
  setupStagingEnv();
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error('Provider fetch must not run');
  };

  await assert.rejects(
    rpc('eth_getBlockByNumber', ['0x1', false, { citizenId: 'fixture-private-data' }]),
    /egovchain_invalid_params/,
  );
  await assert.rejects(rpc('eth_getBlockByNumber', ['0x1', true]), /egovchain_invalid_params/);
  assert.equal(fetchCalls, 0);
});

test('Chain treats HTTP 401 as provider authentication failure in NODE_ENV=test', async () => {
  setupStagingEnv();
  process.env.NODE_ENV = 'test';
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    return new Response('fixture-private-error-body', { status: 401 });
  };

  process.env.EGOVCHAIN_RPC_BASE_URL = 'http://127.0.0.1:8545';
  await assert.rejects(rpc('eth_chainId'), /egovchain_invalid_url/);
  assert.equal(fetchCalls, 0, 'HTTP must remain rejected under NODE_ENV=test');
  process.env.EGOVCHAIN_RPC_BASE_URL = 'https://rpc.fixture.test';

  await assert.rejects(rpc('eth_chainId'), (error: Error) => {
    assert.equal(error.message, 'egovchain_auth_failed');
    assert.doesNotMatch(error.message, /fixture-private-error-body/);
    return true;
  });
  assert.equal(fetchCalls, 1);
});

test('Chain rejects leading-zero request and response quantities', async () => {
  setupStagingEnv();
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0343b' }));
  };

  await assert.rejects(rpc('eth_getBlockByNumber', ['0x01', false]), /egovchain_invalid_params/);
  assert.equal(fetchCalls, 0);
  await assert.rejects(rpc('eth_chainId'), /egovchain_malformed_response/);
  assert.equal(fetchCalls, 1);
});

test('Chain timeout remains active while parsing the provider response body', async () => {
  setupStagingEnv();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let fireTimeout: (() => void) | undefined;
  let markJsonStarted!: () => void;
  const jsonStarted = new Promise<void>((resolve) => { markJsonStarted = resolve; });

  globalThis.setTimeout = ((callback: () => void) => {
    fireTimeout = callback;
    return {} as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout;
  globalThis.clearTimeout = (() => { fireTimeout = undefined; }) as typeof clearTimeout;
  globalThis.fetch = async (_input, init) => {
    const response = new Response('{}');
    response.json = () => {
      markJsonStarted();
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('fixture timeout', 'AbortError')), { once: true });
      }) as Promise<unknown>;
    };
    return response;
  };

  try {
    const request = rpc('eth_chainId');
    await jsonStarted;
    assert.ok(fireTimeout, 'RPC timeout should be scheduled before response parsing');
    fireTimeout();
    await assert.rejects(request, /egovchain_timeout/);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
