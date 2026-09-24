import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import express from 'express';
import { consentCommitment, EGOVCHAIN_CHAIN_ID } from '../src/services/EgovChainService.js';
import blockchainRouter from '../src/routes/blockchain.js';

test('consent commitments are stable for the same salted evidence and change with action', () => {
  const input = { targetId: 'case-1', actorId: 'actor-1', action: 'grant' as const, purpose: 'coordination', version: 'v1.0', scope: 'case', evidence: 'confirmed', idempotencyKey: 'idem-12345678' };
  const first = consentCommitment(input, 'fixed-salt');
  assert.equal(first.commitment, consentCommitment(input, 'fixed-salt').commitment);
  assert.notEqual(first.commitment, consentCommitment({ ...input, action: 'withdraw' }, 'fixed-salt').commitment);
  assert.equal(first.commitment.length, 64);
  assert.equal(EGOVCHAIN_CHAIN_ID, 13371);
});

test('consent writes enqueue one durable anchor and never fabricate simulated proof', () => {
  const platform = fs.readFileSync(new URL('../src/routes/platform.ts', import.meta.url), 'utf8');
  const pair = fs.readFileSync(new URL('../src/routes/rebaseline.ts', import.meta.url), 'utf8');
  assert.match(platform, /INSERT INTO consent_anchor_outbox\(episode_consent_id, commitment\)/);
  assert.match(pair, /INSERT INTO consent_anchor_outbox\(pair_consent_id, commitment\)/);
  assert.doesNotMatch(pair, /simulatedTx|simulatedBlockHash/);
  assert.match(platform, /Idempotency key payload mismatch/);
  assert.match(pair, /counts\.coordination.*counts\.information_sharing/);
  const worker = fs.readFileSync(new URL('../src/worker.ts', import.meta.url), 'utf8');
  assert.match(worker, /verifyReceipt\(txHash!, row\.commitment\)/);
  assert.ok(worker.indexOf('const current = await verifyReceipt') < worker.indexOf('await broadcast(raw!)'));
});

test('legacy chain-info paths cannot return simulated provider evidence', async () => {
  const app = express();
  app.use('/api/blockchain', blockchainRouter);
  app.use('/api/v1/blockchain', blockchainRouter);
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    for (const path of ['/api/blockchain/chain-info', '/api/v1/blockchain/chain-info']) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 404);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
