import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import express from 'express';
import type { Pool } from 'pg';
import { consentCommitment, EGOVCHAIN_CHAIN_ID, publicConsentEvent } from '../src/services/EgovChainService.js';
import blockchainRouter from '../src/routes/blockchain.js';
import { setPool, closePool } from '../src/db/pool.js';
import { createCitizenPlatformRouter } from '../src/routes/platform.js';

test('consent commitments are stable for the same salted evidence and change with action', () => {
  const input = { targetId: 'case-1', actorId: 'actor-1', action: 'grant' as const, purpose: 'coordination', version: 'v1.0', scope: 'case', evidence: 'confirmed', idempotencyKey: 'idem-12345678' };
  const first = consentCommitment(input, 'fixed-salt');
  assert.equal(first.commitment, consentCommitment(input, 'fixed-salt').commitment);
  assert.notEqual(first.commitment, consentCommitment({ ...input, action: 'withdraw' }, 'fixed-salt').commitment);
  assert.equal(first.commitment.length, 64);
  assert.equal(EGOVCHAIN_CHAIN_ID, 13371);
});

test('consent proof status distinguishes pending, unavailable, and verified without leaking provider errors', () => {
  const row = { id: 'consent-1', anchorStatus: 'pending', outboxStatus: 'pending', outboxErrorCode: null };
  assert.deepEqual(publicConsentEvent(row, true), { id: 'consent-1', anchorStatus: 'pending' });
  assert.equal(publicConsentEvent(row, false).anchorStatus, 'unavailable');
  assert.equal(publicConsentEvent({ ...row, outboxStatus: null }, true).anchorStatus, 'unavailable');
  assert.equal(publicConsentEvent({ ...row, outboxStatus: 'failed', outboxErrorCode: 'egovchain_receipt_pending' }, true).anchorStatus, 'pending');
  assert.equal(publicConsentEvent({ ...row, outboxStatus: 'failed', outboxErrorCode: 'egovchain_wrong_chain' }, true).anchorStatus, 'unavailable');
  assert.equal(publicConsentEvent({ ...row, outboxStatus: 'dead_letter' }, true).anchorStatus, 'unavailable');
  assert.equal(publicConsentEvent({ ...row, anchorStatus: 'verified' }, false).anchorStatus, 'verified');
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
  assert.match(worker, /verifyReceipt\(txHash!, row\.commitment, true\)/);
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

test('Citizen consent HTTP view reports unavailable without a chain provider or leaked errors', async () => {
  const episodeId = '00000000-0000-4000-8000-000000000001';
  const accountId = '00000000-0000-4000-8000-000000000002';
  const savedMode = process.env.EBUHAY_MODE;
  const savedChainMode = process.env.EGOVCHAIN_MODE;
  process.env.EBUHAY_MODE = 'synthetic';
  delete process.env.EGOVCHAIN_MODE;
  const query = async (statement: string | { text: string }, _values?: unknown[]) => {
    const sql = typeof statement === 'string' ? statement : statement.text;
    if (sql.startsWith('UPDATE sessions s SET last_seen_at')) return { rowCount: 1, rows: [{ id: accountId, role: 'citizen', display_name: 'Test Citizen', service_scope: [], hospital_id: null }] };
    if (sql.includes('SELECT c.hospital_id AS "hospitalId"')) return { rowCount: 1, rows: [{ hospitalId: null }] };
    if (sql.includes('FROM episode_consents ec LEFT JOIN consent_anchor_outbox')) return { rowCount: 1, rows: [{ id: 'consent-1', episodeId, version: 'v1.0', purpose: 'coordination', scope: `case:${episodeId}:hospital:unassigned:v1.0`, action: 'grant', anchorStatus: 'pending', outboxStatus: 'failed', outboxErrorCode: 'egovchain_wrong_chain' }] };
    throw new Error(`Unexpected database operation: ${sql.slice(0, 60)}`);
  };
  setPool({ query, end: async () => {} } as unknown as Pool);
  const app = express();
  app.use('/api/v1', createCitizenPlatformRouter('synthetic'));
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/episodes/${episodeId}/consent`, { headers: { cookie: `ebuhay_session=${'a'.repeat(43)}` } });
    assert.equal(response.status, 200);
    const payload = await response.json() as { data: { events: Array<Record<string, unknown>> } };
    assert.equal(payload.data.events[0].anchorStatus, 'unavailable');
    assert.equal('outboxErrorCode' in payload.data.events[0], false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closePool();
    if (savedMode === undefined) delete process.env.EBUHAY_MODE; else process.env.EBUHAY_MODE = savedMode;
    if (savedChainMode === undefined) delete process.env.EGOVCHAIN_MODE; else process.env.EGOVCHAIN_MODE = savedChainMode;
  }
});
