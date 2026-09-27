import test from 'node:test';
import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import { closePool, setPool } from '../src/db/pool.js';
import { loadRuntimeConfig } from '../src/runtime/config.js';
import {
  egovchainEnabled,
  rpc,
  checkEgovChainReadonly,
  ALLOWED_RPC_METHODS,
  EGOVCHAIN_CHAIN_ID,
} from '../src/services/EgovChainService.js';
import { runConsentAnchorBatch } from '../src/worker.js';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function setupStagingEnv() {
  process.env.EBUHAY_MODE = 'synthetic';
  process.env.EGOVCHAIN_MODE = 'staging';
  process.env.EGOVCHAIN_RPC_BASE_URL = 'https://rpc.staging.egov.test/rpc';
  process.env.EGOVCHAIN_RPC_TOKEN = 'secret-token-xyz';
  delete process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY;
}

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

test('Ticket 03: configuration does not require signer private key and enables read-only staging', () => {
  setupStagingEnv();
  const cfg = loadRuntimeConfig({
    EBUHAY_MODE: 'synthetic',
    DATABASE_URL: 'postgres://localhost/test',
    EGOVCHAIN_MODE: 'staging',
    EGOVCHAIN_RPC_BASE_URL: 'https://rpc.staging.egov.test',
    EGOVCHAIN_RPC_TOKEN: 'token-abc',
  });
  assert.equal(cfg.mode, 'synthetic');
  assert.equal(egovchainEnabled(), true);

  process.env.EGOVCHAIN_MODE = 'disabled';
  assert.equal(egovchainEnabled(), false);
  delete process.env.EGOVCHAIN_RPC_TOKEN;
  assert.equal(egovchainEnabled(), false);
});

test('Ticket 03: rejects unsupported RPC methods BEFORE initiating network fetch', async () => {
  setupStagingEnv();
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls++;
    throw new Error('fetch should not be called');
  };

  const forbiddenMethods = [
    'eth_sendRawTransaction',
    'eth_sendTransaction',
    'eth_estimateGas',
    'eth_getTransactionReceipt',
    'eth_getTransactionByHash',
    'personal_sign',
  ];

  for (const method of forbiddenMethods) {
    await assert.rejects(
      async () => rpc(method, []),
      (err: Error) => err.message === 'egovchain_unsupported_method'
    );
  }
  assert.equal(fetchCalls, 0);
  assert.deepEqual(ALLOWED_RPC_METHODS, ['eth_chainId', 'eth_gasPrice', 'eth_blockNumber', 'eth_getBlockByNumber']);
});

test('Ticket 03: rejects invalid URLs, embedded credentials, and redirects to prevent token leakage', async () => {
  setupStagingEnv();

  process.env.EGOVCHAIN_RPC_BASE_URL = 'https://user:pass@rpc.staging.egov.test';
  await assert.rejects(async () => rpc('eth_chainId'), /egovchain_invalid_url/);

  process.env.EGOVCHAIN_RPC_BASE_URL = 'https://rpc.staging.egov.test?leak=true';
  await assert.rejects(async () => rpc('eth_chainId'), /egovchain_invalid_url/);

  process.env.EGOVCHAIN_RPC_BASE_URL = 'https://rpc.staging.egov.test#fragment';
  await assert.rejects(async () => rpc('eth_chainId'), /egovchain_invalid_url/);

  setupStagingEnv();
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.redirect, 'error');
    throw new TypeError('Failed to fetch (redirect forbidden)');
  };
  await assert.rejects(async () => rpc('eth_chainId'), /egovchain_network_error/);
});

test('Ticket 03: timeout and authentication failures sanitize error messages to static classifications', async () => {
  setupStagingEnv();

  globalThis.fetch = async (_url, init) => {
    const signal = init?.signal as AbortSignal | undefined;
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    if (signal) {
      Object.defineProperty(signal, 'aborted', { value: true });
    }
    throw err;
  };
  await assert.rejects(async () => rpc('eth_chainId'), (err: Error) => err.message === 'egovchain_timeout');

  globalThis.fetch = async () => new Response('Unauthorized', { status: 401 });
  await assert.rejects(async () => rpc('eth_chainId'), (err: Error) => err.message === 'egovchain_auth_failed');

  globalThis.fetch = async () => new Response('Forbidden', { status: 403 });
  await assert.rejects(async () => rpc('eth_chainId'), (err: Error) => err.message === 'egovchain_auth_failed');

  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, error: { code: 401, message: 'secret auth token leaked' } }), {
      headers: { 'content-type': 'application/json' },
    });
  await assert.rejects(async () => rpc('eth_chainId'), (err: Error) => {
    assert.equal(err.message, 'egovchain_rpc_error');
    assert.doesNotMatch(err.message, /secret auth token/);
    return true;
  });
});

test('Ticket 03: validates JSON-RPC envelope, exact hexadecimal quantities, chain 13371, and gas price 0', async () => {
  setupStagingEnv();

  // Invalid JSON-RPC id/envelope
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '1.0', id: 1, result: '0x343b' }), {
      headers: { 'content-type': 'application/json' },
    });
  await assert.rejects(async () => rpc('eth_chainId'), /egovchain_malformed_response/);

  // Non-hexadecimal chainId
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '13371' }), {
      headers: { 'content-type': 'application/json' },
    });
  await assert.rejects(async () => rpc('eth_chainId'), /egovchain_malformed_response/);

  // Wrong chain ID (e.g., Ethereum mainnet 1)
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1' }), {
      headers: { 'content-type': 'application/json' },
    });
  await assert.rejects(async () => rpc('eth_chainId'), /egovchain_wrong_chain/);

  // Valid chain ID 13371 (0x343b)
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x343b' }), {
      headers: { 'content-type': 'application/json' },
    });
  const chainId = await rpc('eth_chainId');
  assert.equal(chainId, '0x343b');

  // Non-zero gas price
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x1' }), {
      headers: { 'content-type': 'application/json' },
    });
  await assert.rejects(async () => rpc('eth_gasPrice'), /egovchain_nonzero_gas/);

  // Valid zero gas price (0x0)
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x0' }), {
      headers: { 'content-type': 'application/json' },
    });
  const gasPrice = await rpc('eth_gasPrice');
  assert.equal(gasPrice, '0x0');
});

test('Ticket 03: validates block retrieval: requested number and full 32-byte block hash', async () => {
  setupStagingEnv();
  const validHash = `0x${'ab'.repeat(32)}`;

  // Missing or short block hash
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { number: '0x10', hash: '0x1234' } }), {
      headers: { 'content-type': 'application/json' },
    });
  await assert.rejects(async () => rpc('eth_getBlockByNumber', ['0x10', false]), /egovchain_malformed_response/);

  // Block number mismatch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { number: '0x11', hash: validHash } }), {
      headers: { 'content-type': 'application/json' },
    });
  await assert.rejects(async () => rpc('eth_getBlockByNumber', ['0x10', false]), /egovchain_malformed_response/);

  // Valid block
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: { number: '0x10', hash: validHash } }), {
      headers: { 'content-type': 'application/json' },
    });
  const block = (await rpc('eth_getBlockByNumber', ['0x10', false])) as { number: string; hash: string };
  assert.equal(block.number, '0x10');
  assert.equal(block.hash, validHash);
});

test('Ticket 03: privacy check ensures zero citizen or consent data in network reads', async () => {
  setupStagingEnv();
  const requestBodies: string[] = [];
  globalThis.fetch = async (_url, init) => {
    requestBodies.push(String(init?.body));
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x343b' }), {
      headers: { 'content-type': 'application/json' },
    });
  };

  await rpc('eth_chainId', []);
  assert.equal(requestBodies.length, 1);
  const payload = JSON.parse(requestBodies[0]);
  assert.equal(payload.method, 'eth_chainId');
  assert.deepEqual(payload.params, []);
  assert.doesNotMatch(requestBodies[0], /citizen|patient|actor|consent|evidence|hospital/i);
});

test('Ticket 03: operator check helper performs full read-only staging observation', async () => {
  setupStagingEnv();
  const validHash = `0x${'fe'.repeat(32)}`;

  globalThis.fetch = async (_url, init) => {
    const { method } = JSON.parse(String(init?.body));
    let result: unknown;
    if (method === 'eth_chainId') result = '0x343b';
    else if (method === 'eth_gasPrice') result = '0x0';
    else if (method === 'eth_blockNumber') result = '0x200';
    else if (method === 'eth_getBlockByNumber') result = { number: '0x200', hash: validHash };
    else throw new Error(`unexpected method ${method}`);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
      headers: { 'content-type': 'application/json' },
    });
  };

  const observation = await checkEgovChainReadonly();
  assert.equal(observation.ok, true);
  assert.equal(observation.chainId, EGOVCHAIN_CHAIN_ID);
  assert.equal(observation.gasPrice, '0x0');
  assert.equal(observation.blockNumber, '0x200');
  assert.equal(observation.blockHash, validHash);
  assert.ok(observation.observedAt);
});

test('Ticket 03: read-only Chain worker does not access the database, lease, sign, or broadcast', async () => {
  setupStagingEnv();
  let databaseCalls = 0;
  setPool({
    query: async () => { databaseCalls++; throw new Error('Database access is forbidden in this test'); },
    end: async () => {},
  } as unknown as Pool);
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls++;
    throw new Error('No network should be reached by worker');
  };

  try {
    const result = await runConsentAnchorBatch({ batchSize: 50, workerId: 'test-worker' });
    assert.deepEqual(result, { leased: 0, verified: 0, failed: 0 });
    assert.equal(databaseCalls, 0);
    assert.equal(networkCalls, 0);
  } finally {
    await closePool();
  }
});
