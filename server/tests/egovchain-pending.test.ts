import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet, keccak256 } from 'ethers';
import type { Pool } from 'pg';
import { setPool, closePool } from '../src/db/pool.js';
import { runConsentAnchorBatch } from '../src/worker.js';
import { publicConsentEvent, signConsentTransaction } from '../src/services/EgovChainService.js';

interface FakeOutboxRow {
  id: string; episode_consent_id: string | null; pair_consent_id: string | null; commitment: string;
  tx_hash: string | null; status: string; last_error_code: string | null; attempts: number;
  nonce: number | null; raw_transaction: string | null; signer_address?: string | null; lease_owner?: string | null;
}
interface FakeConsentRow {
  id: string; anchor_status: string; anchor_error_code: string | null;
  anchor_tx_hash: string | null; anchor_block_hash: string | null; anchor_block_number: number | null;
}

const TEST_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const testSigner = new Wallet(TEST_KEY).address.toLowerCase();
const testBlockHash = '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const testBlockNumber = '0x100';

function makeFixtures(suffix: string, commitment: string, raw: string | null = null, txHash: string | null = null, attempts = 0) {
  const outbox: FakeOutboxRow = {
    id: `outbox-${suffix}`, episode_consent_id: `consent-${suffix}`, pair_consent_id: null,
    commitment, tx_hash: txHash, status: 'pending', last_error_code: null, attempts, nonce: raw ? 1 : null, raw_transaction: raw,
  };
  const consent: FakeConsentRow = {
    id: `consent-${suffix}`, anchor_status: 'pending', anchor_error_code: null,
    anchor_tx_hash: null, anchor_block_hash: null, anchor_block_number: null,
  };
  return { outbox, consent };
}

function createFakePool(outboxRows: FakeOutboxRow[], consentRows: FakeConsentRow[]) {
  const queryHandler = async (statement: string | { text: string }, values: unknown[] = []) => {
    const sql = typeof statement === 'string' ? statement : statement.text;
    const params = values ?? [];
    if (/BEGIN|COMMIT|ROLLBACK|pg_advisory_xact_lock/.test(sql)) return { rowCount: 0, rows: [] };
    if (sql.includes("UPDATE consent_anchor_outbox SET status='sending'")) {
      const leasable = outboxRows.filter((r) => r.status === 'pending' || r.status === 'failed');
      for (const r of leasable) { r.status = 'sending'; r.attempts++; r.lease_owner = (params[1] as string) ?? 'test-owner'; }
      return { rowCount: leasable.length, rows: leasable };
    }
    if (sql.includes('SELECT COALESCE(max(nonce)+1,0)')) {
      const nonces = outboxRows.filter((r) => r.nonce !== null).map((r) => r.nonce!);
      return { rowCount: 1, rows: [{ next: nonces.length ? Math.max(...nonces) + 1 : 0 }] };
    }
    if (sql.includes('UPDATE consent_anchor_outbox SET signer_address=$1')) {
      const row = outboxRows.find((r) => r.id === params[4]);
      if (row) { row.signer_address = params[0] as string; row.nonce = params[1] as number; row.raw_transaction = params[2] as string; row.tx_hash = params[3] as string; return { rowCount: 1, rows: [] }; }
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('UPDATE consent_anchor_outbox SET status=$1') && sql.includes('WHERE id=$3')) {
      const row = outboxRows.find((r) => r.id === params[2]);
      if (row) { row.status = params[0] as string; row.last_error_code = params[1] as string | null; row.lease_owner = null; return { rowCount: 1, rows: [] }; }
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('UPDATE episode_consents c SET anchor_status=$1')) {
      const consent = consentRows.find((c) => c.id === params[5]);
      if (consent) {
        consent.anchor_status = params[0] as string; consent.anchor_tx_hash = params[1] as string | null;
        consent.anchor_block_hash = params[2] as string | null; consent.anchor_block_number = params[3] as number | null;
        consent.anchor_error_code = params[4] as string | null; return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes('UPDATE consent_anchor_outbox SET status=CASE')) {
      const row = outboxRows.find((r) => r.id === params[1]);
      if (row) {
        const code = params[0] as string;
        const pendingExempt = sql.includes("attempts>=8 AND $1 <> 'egovchain_receipt_pending'");
        row.status = (row.attempts >= 8 && !(pendingExempt && code === 'egovchain_receipt_pending')) ? 'dead_letter' : 'failed';
        row.last_error_code = code; row.lease_owner = null; return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (sql.includes("FROM consent_anchor_outbox WHERE status='verified'")) return { rowCount: 0, rows: [] };
    throw new Error(`Unhandled fake pool query: ${sql}`);
  };
  return { query: queryHandler, connect: async () => ({ query: queryHandler, release: () => {} }), end: async () => {} } as unknown as Pool;
}

interface MockRpcState {
  broadcastCalls: string[];
  nodeTxs: Map<string, { hash: string; raw: string; mined: boolean }>;
  customGetTxByHash?: (txHash: string) => unknown;
  customGetReceipt?: (txHash: string) => unknown;
}

function setupMockFetch(outboxRows: FakeOutboxRow[], state: MockRpcState) {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const { id, method, params } = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
    let result: unknown = null;
    if (method === 'eth_chainId') result = '0x343b';
    else if (method === 'eth_gasPrice') result = '0x0';
    else if (method === 'eth_estimateGas') result = '0x5208';
    else if (method === 'eth_getTransactionCount') result = '0x0';
    else if (method === 'eth_sendRawTransaction') {
      const raw = String(params[0]);
      state.broadcastCalls.push(raw);
      const txHash = keccak256(raw).toLowerCase();
      state.nodeTxs.set(txHash, { hash: txHash, raw, mined: false });
      result = txHash;
    } else if (method === 'eth_getTransactionReceipt') {
      const txHash = String(params?.[0] ?? '').toLowerCase();
      const tx = state.nodeTxs.get(txHash);
      result = state.customGetReceipt ? state.customGetReceipt(txHash) : tx?.mined ? { transactionHash: txHash, status: '0x1', blockHash: testBlockHash, blockNumber: testBlockNumber } : null;
    } else if (method === 'eth_getTransactionByHash') {
      const txHash = String(params?.[0] ?? '').toLowerCase();
      if (state.customGetTxByHash) result = state.customGetTxByHash(txHash);
      else {
        const tx = state.nodeTxs.get(txHash);
        const row = outboxRows.find((r) => r.tx_hash?.toLowerCase() === txHash);
        result = tx ? { hash: txHash, from: testSigner, to: testSigner, value: '0x0', chainId: '0x343b', input: `0x${row?.commitment ?? ''}`.toLowerCase() } : null;
      }
    } else if (method === 'eth_getBlockByNumber') {
      result = { hash: testBlockHash, transactions: Array.from(state.nodeTxs.keys()) };
    } else throw new Error(`Unhandled RPC method: ${method}`);
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

test('delayed eGovChain mining, receipt handling, and broadcast deduplication', async (t) => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  process.env.EBUHAY_MODE = 'synthetic';
  process.env.EGOVCHAIN_MODE = 'staging';
  process.env.EGOVCHAIN_RPC_BASE_URL = 'http://egovchain.local';
  process.env.EGOVCHAIN_RPC_TOKEN = 'synthetic-test-token';
  process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY = TEST_KEY;

  t.after(async () => {
    for (const key of Object.keys(process.env)) {
      if (key in originalEnv) process.env[key] = originalEnv[key];
      else delete process.env[key];
    }
    globalThis.fetch = originalFetch;
    await closePool();
  });

  await t.test('>8 pending cycles remain publicly pending, zero duplicate broadcasts, eventual verified', async () => {
    const { outbox, consent } = makeFixtures('delayed-1', '1'.repeat(64));
    const rpcState: MockRpcState = { broadcastCalls: [], nodeTxs: new Map() };
    setPool(createFakePool([outbox], [consent]));
    setupMockFetch([outbox], rpcState);

    for (let cycle = 1; cycle <= 9; cycle++) {
      const res = await runConsentAnchorBatch({ batchSize: 10 });
      assert.equal(res.leased, 1, `Cycle ${cycle} leases row`);
      assert.equal(res.verified, 0, `Cycle ${cycle} unverified before receipt`);
      assert.equal(res.failed, 1, `Cycle ${cycle} reports failed for pending cycle`);
      assert.equal(rpcState.broadcastCalls.length, 1, `Cycle ${cycle}: zero duplicate broadcast while visible`);
      assert.equal(outbox.attempts, cycle);
      assert.equal(outbox.status, 'failed', `Cycle ${cycle}: status remains failed, not dead_letter`);
      assert.equal(outbox.last_error_code, 'egovchain_receipt_pending');
      const pub = publicConsentEvent({ anchorStatus: consent.anchor_status, outboxStatus: outbox.status, outboxErrorCode: outbox.last_error_code }, true);
      assert.equal(pub.anchorStatus, 'pending', `Cycle ${cycle}: public view remains pending`);
    }

    const txHash = outbox.tx_hash!.toLowerCase();
    rpcState.nodeTxs.get(txHash)!.mined = true;
    const finalRes = await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(finalRes.leased, 1);
    assert.equal(finalRes.verified, 1);
    assert.equal(rpcState.broadcastCalls.length, 1);
    assert.equal(outbox.status, 'verified');
    assert.equal(consent.anchor_status, 'verified');
    assert.equal(consent.anchor_tx_hash?.toLowerCase(), txHash);
    const pub = publicConsentEvent({ anchorStatus: consent.anchor_status, outboxStatus: outbox.status, outboxErrorCode: outbox.last_error_code }, true);
    assert.equal(pub.anchorStatus, 'verified');
  });

  await t.test('crash-before-broadcast null lookup causes one send', async () => {
    const signed = await signConsentTransaction('2'.repeat(64), 10);
    const { outbox, consent } = makeFixtures('crash-1', '2'.repeat(64), signed.raw, signed.txHash);
    const rpcState: MockRpcState = { broadcastCalls: [], nodeTxs: new Map() };
    setPool(createFakePool([outbox], [consent]));
    setupMockFetch([outbox], rpcState);

    await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(rpcState.broadcastCalls.length, 1);
    assert.equal(rpcState.broadcastCalls[0], signed.raw);

    await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(rpcState.broadcastCalls.length, 1);
  });

  await t.test('dropped tx resends identical raw bytes and deduplicates once visible again', async () => {
    const signed = await signConsentTransaction('3'.repeat(64), 11);
    const { outbox, consent } = makeFixtures('dropped-1', '3'.repeat(64), signed.raw, signed.txHash);
    const rpcState: MockRpcState = { broadcastCalls: [], nodeTxs: new Map() };
    setPool(createFakePool([outbox], [consent]));
    setupMockFetch([outbox], rpcState);

    await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(rpcState.broadcastCalls.length, 1);

    rpcState.nodeTxs.delete(signed.txHash.toLowerCase());
    await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(rpcState.broadcastCalls.length, 2);
    assert.equal(rpcState.broadcastCalls[1], signed.raw);

    await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(rpcState.broadcastCalls.length, 2);
  });

  await t.test('mismatched or malformed tx lookup fails closed and caps at 8 attempts', async () => {
    const signed = await signConsentTransaction('4'.repeat(64), 12);
    const { outbox, consent } = makeFixtures('mismatch-1', '4'.repeat(64), signed.raw, signed.txHash, 7);
    const rpcState: MockRpcState = { broadcastCalls: [], nodeTxs: new Map(), customGetTxByHash: () => ({ hash: '0x' + '9'.repeat(64) }) };
    setPool(createFakePool([outbox], [consent]));
    setupMockFetch([outbox], rpcState);

    await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(outbox.attempts, 8);
    assert.equal(outbox.status, 'dead_letter');
    assert.notEqual(outbox.last_error_code, 'egovchain_receipt_pending');
    const pub = publicConsentEvent({ anchorStatus: consent.anchor_status, outboxStatus: outbox.status, outboxErrorCode: outbox.last_error_code }, true);
    assert.equal(pub.anchorStatus, 'unavailable');
  });

  await t.test('noncanonical receipt for a known transaction fails closed and caps at 8 attempts', async () => {
    const signed = await signConsentTransaction('5'.repeat(64), 13);
    const { outbox, consent } = makeFixtures('receipt-1', '5'.repeat(64), signed.raw, signed.txHash, 7);
    const rpcState: MockRpcState = {
      broadcastCalls: [], nodeTxs: new Map([[signed.txHash.toLowerCase(), { hash: signed.txHash, raw: signed.raw, mined: true }]]),
      customGetReceipt: (txHash) => ({ transactionHash: txHash, status: '0x1', blockHash: '0x' + 'f'.repeat(64), blockNumber: testBlockNumber }),
    };
    setPool(createFakePool([outbox], [consent]));
    setupMockFetch([outbox], rpcState);

    await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(outbox.attempts, 8);
    assert.equal(outbox.status, 'dead_letter');
    assert.equal(outbox.last_error_code, 'egovchain_invalid_receipt');
    assert.equal(rpcState.broadcastCalls.length, 0);
    const pub = publicConsentEvent({ anchorStatus: consent.anchor_status, outboxStatus: outbox.status, outboxErrorCode: outbox.last_error_code }, true);
    assert.equal(pub.anchorStatus, 'unavailable');
  });
});
