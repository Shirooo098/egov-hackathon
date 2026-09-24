import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import type { Pool } from 'pg';
import { setPool, closePool } from '../src/db/pool.js';
import { runConsentAnchorBatch } from '../src/worker.js';
import { verifyReceipt } from '../src/services/EgovChainService.js';

interface FakeOutboxRow {
  id: string;
  episode_consent_id: string | null;
  pair_consent_id: string | null;
  commitment: string;
  tx_hash: string;
  status: string;
  last_error_code: string | null;
  attempts: number;
  nonce: number | null;
  raw_transaction: string | null;
}

interface FakeConsentRow {
  id: string;
  anchor_status: string;
  anchor_error_code: string | null;
  anchor_tx_hash: string | null;
  anchor_block_hash: string | null;
  anchor_block_number: number | null;
}

const TEST_SIGNER_PRIVATE_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const testSignerAddress = new Wallet(TEST_SIGNER_PRIVATE_KEY).address;
const testBlockHash = '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
const testBlockNumber = '0x100';

function createFakePool(outboxRows: FakeOutboxRow[], consentRows: FakeConsentRow[]) {
  const queryHandler = async (statement: string | { text: string }, values: unknown[] = []) => {
    const sql = typeof statement === 'string' ? statement : statement.text;
    const params = values ?? [];

    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rowCount: 0, rows: [] };

    if (sql.includes("UPDATE consent_anchor_outbox SET status='sending'")) {
      const pending = outboxRows.filter((r) => r.status === 'pending');
      for (const r of pending) {
        r.status = 'sending';
        r.attempts++;
      }
      return { rowCount: pending.length, rows: pending };
    }

    if (sql.includes("FROM consent_anchor_outbox WHERE status='verified'")) {
      const verified = outboxRows.filter((r) => r.status === 'verified');
      return {
        rowCount: verified.length,
        rows: verified.map((r) => ({
          id: r.id,
          episode_consent_id: r.episode_consent_id,
          pair_consent_id: r.pair_consent_id,
          commitment: r.commitment,
          tx_hash: r.tx_hash,
        })),
      };
    }

    if (sql.includes("UPDATE consent_anchor_outbox SET status='failed',last_error_code='receipt_reorged'")) {
      const row = outboxRows.find((r) => r.id === params[0] && r.status === 'verified');
      if (row) {
        row.status = 'failed';
        row.last_error_code = 'receipt_reorged';
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }

    if (sql.includes("UPDATE episode_consents c SET anchor_status='failed',anchor_error_code='receipt_reorged'")) {
      const consent = consentRows.find((c) => c.id === params[0]);
      if (consent) {
        consent.anchor_status = 'failed';
        consent.anchor_error_code = 'receipt_reorged';
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }

    if (sql.includes("UPDATE consent_anchor_outbox SET status=$1") && sql.includes("WHERE id=$3")) {
      const row = outboxRows.find((r) => r.id === params[2]);
      if (row) {
        row.status = params[0] as string;
        row.last_error_code = params[1] as string | null;
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }

    if (sql.includes("UPDATE episode_consents c SET anchor_status=$1") && sql.includes("WHERE o.episode_consent_id=$6")) {
      const consent = consentRows.find((c) => c.id === params[5]);
      if (consent) {
        consent.anchor_status = params[0] as string;
        consent.anchor_tx_hash = params[1] as string | null;
        consent.anchor_block_hash = params[2] as string | null;
        consent.anchor_block_number = params[3] as number | null;
        consent.anchor_error_code = params[4] as string | null;
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    }

    throw new Error(`Unhandled fake pool query: ${sql}`);
  };

  const client = { query: queryHandler, release: () => {} };
  return {
    query: queryHandler,
    connect: async () => client,
    end: async () => {},
  } as unknown as Pool;
}

function setupMockFetch(outboxRows: FakeOutboxRow[], getReceiptStatus: (txHash: string) => '0x0' | '0x1', receiptTxHash?: string | null) {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const rawBody = typeof init?.body === 'string' ? init.body : '';
    const { id, method, params } = JSON.parse(rawBody);
    let result: unknown = null;

    if (method === 'eth_getTransactionReceipt') {
      const txHash = String(params?.[0] ?? '').toLowerCase();
      result = {
        transactionHash: receiptTxHash === null ? undefined : receiptTxHash ?? txHash,
        status: getReceiptStatus(txHash),
        blockHash: testBlockHash,
        blockNumber: testBlockNumber,
      };
    } else if (method === 'eth_getTransactionByHash') {
      const txHash = String(params?.[0] ?? '').toLowerCase();
      const row = outboxRows.find((r) => r.tx_hash.toLowerCase() === txHash);
      result = {
        hash: txHash,
        from: testSignerAddress.toLowerCase(),
        to: testSignerAddress.toLowerCase(),
        value: '0x0',
        chainId: '0x343b', // 13371
        input: `0x${row?.commitment ?? ''}`.toLowerCase(),
      };
    } else if (method === 'eth_getBlockByNumber') {
      result = {
        hash: testBlockHash,
        transactions: outboxRows.map((r) => r.tx_hash.toLowerCase()),
      };
    } else {
      throw new Error(`Unhandled RPC method: ${method}`);
    }

    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

test('verified-consent reorg sweep and initial reverted receipt handling', async (t) => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  process.env.EBUHAY_MODE = 'synthetic';
  process.env.EGOVCHAIN_MODE = 'staging';
  process.env.EGOVCHAIN_RPC_BASE_URL = 'http://egovchain.local';
  process.env.EGOVCHAIN_RPC_TOKEN = 'synthetic-test-token';
  process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY = TEST_SIGNER_PRIVATE_KEY;

  t.after(async () => {
    for (const key of Object.keys(process.env)) {
      if (key in originalEnv) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    }
    globalThis.fetch = originalFetch;
    await closePool();
  });

  await t.test('sweep revokes previously verified anchor when canonical receipt has status 0x0', async () => {
    const outboxRow: FakeOutboxRow = {
      id: 'outbox-sweep-0x0',
      episode_consent_id: 'consent-sweep-0x0',
      pair_consent_id: null,
      commitment: '1111111111111111111111111111111111111111111111111111111111111111',
      tx_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      status: 'verified',
      last_error_code: null,
      attempts: 1,
      nonce: 0,
      raw_transaction: null,
    };
    const consentRow: FakeConsentRow = {
      id: 'consent-sweep-0x0',
      anchor_status: 'verified',
      anchor_error_code: null,
      anchor_tx_hash: outboxRow.tx_hash,
      anchor_block_hash: testBlockHash,
      anchor_block_number: 256,
    };

    setPool(createFakePool([outboxRow], [consentRow]));
    setupMockFetch([outboxRow], () => '0x0');

    const result = await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(result.reorged, 1, 'Should record one reorged anchor');
    assert.equal(outboxRow.status, 'failed', 'Outbox status must be updated to failed');
    assert.equal(outboxRow.last_error_code, 'receipt_reorged', 'Outbox error code must be receipt_reorged');
    assert.equal(consentRow.anchor_status, 'failed', 'Consent anchor status must be updated to failed');
    assert.equal(consentRow.anchor_error_code, 'receipt_reorged', 'Consent error code must be receipt_reorged');
  });

  await t.test('sweep preserves verified anchor when canonical receipt has status 0x1', async () => {
    const outboxRow: FakeOutboxRow = {
      id: 'outbox-sweep-0x1',
      episode_consent_id: 'consent-sweep-0x1',
      pair_consent_id: null,
      commitment: '2222222222222222222222222222222222222222222222222222222222222222',
      tx_hash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      status: 'verified',
      last_error_code: null,
      attempts: 1,
      nonce: 1,
      raw_transaction: null,
    };
    const consentRow: FakeConsentRow = {
      id: 'consent-sweep-0x1',
      anchor_status: 'verified',
      anchor_error_code: null,
      anchor_tx_hash: outboxRow.tx_hash,
      anchor_block_hash: testBlockHash,
      anchor_block_number: 256,
    };

    setPool(createFakePool([outboxRow], [consentRow]));
    setupMockFetch([outboxRow], () => '0x1');

    const result = await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(result.reorged, 0, 'No reorg should be recorded for 0x1 receipt');
    assert.equal(outboxRow.status, 'verified', 'Outbox status must remain verified');
    assert.equal(outboxRow.last_error_code, null);
    assert.equal(consentRow.anchor_status, 'verified', 'Consent anchor status must remain verified');
    assert.equal(consentRow.anchor_error_code, null);
  });

  await t.test('initial batch records reverted receipt (0x0) as failed with reverted error code', async () => {
    const outboxRow: FakeOutboxRow = {
      id: 'outbox-init-reverted',
      episode_consent_id: 'consent-init-reverted',
      pair_consent_id: null,
      commitment: '3333333333333333333333333333333333333333333333333333333333333333',
      tx_hash: '0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      status: 'pending',
      last_error_code: null,
      attempts: 0,
      nonce: 2,
      raw_transaction: '0x1234',
    };
    const consentRow: FakeConsentRow = {
      id: 'consent-init-reverted',
      anchor_status: 'pending',
      anchor_error_code: null,
      anchor_tx_hash: null,
      anchor_block_hash: null,
      anchor_block_number: null,
    };

    setPool(createFakePool([outboxRow], [consentRow]));
    setupMockFetch([outboxRow], () => '0x0');

    const result = await runConsentAnchorBatch({ batchSize: 10 });
    assert.equal(result.leased, 1, 'Should lease the pending outbox row');
    assert.equal(result.verified, 0, 'Should not verify 0x0 receipt');
    assert.equal(result.failed, 1, 'Should mark reverted receipt as failed');
    assert.equal(result.reorged, 0, 'Initial reverted receipt is not a reorg');
    assert.equal(outboxRow.status, 'failed', 'Outbox status must be failed');
    assert.equal(outboxRow.last_error_code, 'reverted', 'Outbox error code must be reverted');
    assert.equal(consentRow.anchor_status, 'failed', 'Consent status must be failed');
    assert.equal(consentRow.anchor_error_code, 'reverted', 'Consent error code must be reverted');
  });

  await t.test('receipt must name the requested transaction', async () => {
    const row = { tx_hash: '0x' + 'd'.repeat(64), commitment: '4'.repeat(64) } as FakeOutboxRow;
    setupMockFetch([row], () => '0x1', null);
    assert.equal(await verifyReceipt(row.tx_hash, row.commitment), null);
    setupMockFetch([row], () => '0x1', '0x' + 'e'.repeat(64));
    assert.equal(await verifyReceipt(row.tx_hash, row.commitment), null);
  });
});
