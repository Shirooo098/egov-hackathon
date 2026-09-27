import test from 'node:test';
import assert from 'node:assert/strict';
import { Wallet } from 'ethers';
import { verifyReceipt } from '../src/services/EgovChainService.js';

const TEST_KEY = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const testSigner = new Wallet(TEST_KEY).address.toLowerCase();
const testTxHash = '0x' + '1'.repeat(64);
const testBlockHash = '0x' + '2'.repeat(64);
const testBlockNumber = '0x100';
const testCommitment = '3'.repeat(64);

interface MockTxData {
  value?: unknown;
  status?: string;
  from?: string;
  to?: string;
  hash?: string;
  input?: string;
  chainId?: string;
  blockHash?: string;
  blockNumber?: string;
}

test('egovchain receipt validation and fail-closed transaction value semantics', async (t) => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  process.env.EBUHAY_MODE = 'synthetic';
  process.env.EGOVCHAIN_MODE = 'staging';
  process.env.EGOVCHAIN_RPC_BASE_URL = 'http://egovchain.synthetic.local';
  process.env.EGOVCHAIN_RPC_TOKEN = 'synthetic-token';
  process.env.EGOVCHAIN_SIGNER_PRIVATE_KEY = TEST_KEY;

  let currentTxMock: MockTxData = {};

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const { id, method } = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
    let result: unknown = null;
    if (method === 'eth_getTransactionReceipt') {
      result = {
        transactionHash: currentTxMock.hash ?? testTxHash,
        status: currentTxMock.status ?? '0x1',
        blockHash: currentTxMock.blockHash ?? testBlockHash,
        blockNumber: currentTxMock.blockNumber ?? testBlockNumber,
      };
    } else if (method === 'eth_getTransactionByHash') {
      const txObj: Record<string, unknown> = {
        hash: currentTxMock.hash ?? testTxHash,
        from: currentTxMock.from ?? testSigner,
        to: currentTxMock.to ?? testSigner,
        input: currentTxMock.input ?? `0x${testCommitment}`,
        chainId: currentTxMock.chainId ?? '0x343b',
      };
      if ('value' in currentTxMock) {
        txObj.value = currentTxMock.value;
      }
      result = txObj;
    } else if (method === 'eth_getBlockByNumber') {
      result = {
        hash: currentTxMock.blockHash ?? testBlockHash,
        transactions: [currentTxMock.hash ?? testTxHash],
      };
    } else {
      throw new Error(`Unexpected RPC method: ${method}`);
    }
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  t.after(() => {
    for (const key of Object.keys(process.env)) {
      if (key in originalEnv) process.env[key] = originalEnv[key];
      else delete process.env[key];
    }
    globalThis.fetch = originalFetch;
  });

  await t.test('strict verifyReceipt rejects transaction with missing value (Ticket03 fail-closed bug)', async () => {
    currentTxMock = {}; // no 'value' property
    await assert.rejects(
      () => verifyReceipt(testTxHash, testCommitment, true),
      { name: 'Error', message: 'egovchain_invalid_receipt' }
    );
  });

  await t.test('non-strict verifyReceipt returns null for transaction with missing value', async () => {
    currentTxMock = {}; // no 'value' property
    const res = await verifyReceipt(testTxHash, testCommitment, false);
    assert.equal(res, null);
  });

  await t.test('rejects missing and non-string values in strict and non-strict mode', async () => {
    for (const val of [undefined, null, 0, false, [], {}]) {
      currentTxMock = { value: val };
      await assert.rejects(
        () => verifyReceipt(testTxHash, testCommitment, true),
        { name: 'Error', message: 'egovchain_invalid_receipt' }
      );
      const res = await verifyReceipt(testTxHash, testCommitment, false);
      assert.equal(res, null);
    }
  });

  await t.test('rejects malformed transaction value strings without leaking SyntaxError', async () => {
    for (const val of ['not-a-number', '', '   ', '0x', '0xzz']) {
      currentTxMock = { value: val };
      await assert.rejects(
        () => verifyReceipt(testTxHash, testCommitment, true),
        (err: Error) => {
          assert.equal(err.name, 'Error');
          assert.equal(err.message, 'egovchain_invalid_receipt');
          return true;
        }
      );
      const res = await verifyReceipt(testTxHash, testCommitment, false);
      assert.equal(res, null);
    }
  });

  await t.test('rejects nonzero transaction value in strict and non-strict mode', async () => {
    for (const val of ['0x1', '0x100', '1000']) {
      currentTxMock = { value: val };
      await assert.rejects(
        () => verifyReceipt(testTxHash, testCommitment, true),
        { name: 'Error', message: 'egovchain_invalid_receipt' }
      );
      const res = await verifyReceipt(testTxHash, testCommitment, false);
      assert.equal(res, null);
    }
  });

  await t.test('preserves compatible explicit zero strings (0x0, 0x00, 0)', async () => {
    for (const val of ['0x0', '0x00', '0']) {
      currentTxMock = { value: val };
      const strictRes = await verifyReceipt(testTxHash, testCommitment, true);
      assert.ok(strictRes);
      assert.equal(strictRes?.status, '0x1');
      assert.equal(strictRes?.transactionHash, testTxHash);

      const nonStrictRes = await verifyReceipt(testTxHash, testCommitment, false);
      assert.ok(nonStrictRes);
      assert.equal(nonStrictRes?.status, '0x1');
    }
  });

  await t.test('failed receipt status 0x0 remains valid evidence of failure when value is valid zero', async () => {
    currentTxMock = { status: '0x0', value: '0x0' };
    const res = await verifyReceipt(testTxHash, testCommitment, true);
    assert.ok(res);
    assert.equal(res?.status, '0x0');
    assert.equal(res?.transactionHash, testTxHash);
  });
});
