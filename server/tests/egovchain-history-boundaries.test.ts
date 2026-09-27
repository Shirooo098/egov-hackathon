import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { closePool, setPool } from '../src/db/pool.js';
import { createCitizenPlatformRouter } from '../src/routes/platform.js';
import { createPrivacyRouter } from '../src/routes/privacy.js';
import type { RuntimeConfig } from '../src/runtime/config.js';

const originalEnv = { ...process.env };
const accountId = '00000000-0000-4000-8000-000000000002';
const episodeId = '00000000-0000-4000-8000-000000000001';
const sessionToken = 'a'.repeat(43);

function result(rows: Record<string, unknown>[] = []) {
  return { rows, rowCount: rows.length, fields: [] };
}

test('consent replay and Citizen export normalize verified and pending history states', async () => {
  process.env.EBUHAY_MODE = 'synthetic';
  process.env.EGOVCHAIN_MODE = 'disabled';
  process.env.ALLOWED_ORIGINS = 'http://localhost:3000';
  const account = {
    id: accountId,
    role: 'citizen',
    display_name: 'Fixture Citizen',
    service_scope: [],
    hospital_id: null,
  };
  let replayRow: Record<string, unknown>;
  const privateRows = [
    { id: 'verified-event', consentVersion: 'v1.0', action: 'grant', purpose: 'coordination', scope: 'fixture-scope', commitment: 'fixture-commitment', anchorStatus: 'verified', evidence: 'private-evidence', idempotencyKey: 'private-key', outboxStatus: 'sent', outboxErrorCode: 'private-error' },
    { id: 'pending-event', consentVersion: 'v1.0', action: 'grant', purpose: 'information_sharing', scope: 'fixture-scope', commitment: 'fixture-commitment', anchorStatus: 'pending', evidence: 'private-evidence', idempotencyKey: 'private-key', outboxStatus: 'pending', outboxErrorCode: 'private-error' },
  ];
  const exportedConsentRows = privateRows.map(({ evidence: _evidence, idempotencyKey: _key, ...row }) => row);
  const databaseQuery = async (statement: string | { text: string }) => {
    const sql = typeof statement === 'string' ? statement : statement.text;
    if (sql.trimStart().startsWith('UPDATE sessions s SET last_seen_at')) return result([account]);
    if (sql.includes('FROM accounts WHERE id =')) return result([{ id: accountId, loginIdentity: 'fixture@example.test', displayName: 'Fixture Citizen', role: 'citizen', status: 'active', createdAt: new Date(0) }]);
    if (sql.includes('FROM citizen_profiles WHERE account_id =')) return result();
    if (sql.includes('FROM notification_preferences WHERE account_id =')) return result();
    if (sql.includes('FROM citizen_cases c')) return result();
    if (sql.includes('FROM recipient_intakes ri')) return result();
    if (sql.includes('FROM appointment_requests ar')) return result();
    if (sql.includes('FROM bookings b')) return result();
    if (sql.includes('FROM episode_consents ec')) {
      assert.doesNotMatch(sql, /\bevidence\b|idempotency_key/i);
      return result(exportedConsentRows);
    }
    if (sql.includes('FROM notifications WHERE recipient_account_id =')) return result();
    if (sql.includes('FROM privacy_requests WHERE account_id =')) return result();
    if (sql.includes('FROM privacy_correction_history WHERE account_id =')) return result();
    if (sql.trimStart().startsWith('INSERT INTO audit_events')) return result();
    throw new Error(`Unexpected fake database query: ${sql.slice(0, 80)}`);
  };
  const clientQuery = async (statement: string | { text: string }) => {
    const sql = typeof statement === 'string' ? statement : statement.text;
    const normalized = sql.toLowerCase();
    if (['begin', 'commit', 'rollback'].includes(normalized) || normalized.includes('pg_advisory_xact_lock')) return result();
    if (normalized.includes('from episodes e join citizen_cases c')) return result([{ id: episodeId, lifecycle: 'active', participation: 'active', version: 1, hospitalId: null }]);
    if (normalized.includes('from episode_consents where actor_account_id')) return result([replayRow]);
    throw new Error(`Unexpected fake transaction query: ${sql.slice(0, 80)}`);
  };
  class FakePool {
    query = databaseQuery;
    connect = async () => ({ query: clientQuery, release() {} });
    end = async () => {};
  }
  setPool(new FakePool() as unknown as Pool);

  const config = { mode: 'synthetic', databaseUrl: 'postgres://fixture-only' } as RuntimeConfig;
  const app = express();
  app.use(express.json());
  app.use('/api/v1', createCitizenPlatformRouter('synthetic'));
  app.use('/api/privacy', createPrivacyRouter(config));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Server failed to bind locally');
  const base = `http://127.0.0.1:${address.port}`;
  const headers = { cookie: `ebuhay_session=${sessionToken}`, origin: 'http://localhost:3000', 'content-type': 'application/json' };

  try {
    for (const row of privateRows) {
      replayRow = { ...row, episodeId, consentVersion: 'v1.0', evidence: 'private-evidence', idempotencyKey: `fixture-${row.id}`, createdAt: new Date(0) };
      const replay = await fetch(`${base}/api/v1/episodes/${episodeId}/consent`, {
        method: 'POST', headers,
        body: JSON.stringify({ action: row.action, consentVersion: 'v1.0', purpose: row.purpose, scope: row.scope, evidence: 'private-evidence', idempotencyKey: `fixture-${row.id}` }),
      });
      assert.equal(replay.status, 200);
      const replayData = (await replay.json() as { data: Record<string, unknown> }).data;
      assert.equal(replayData.anchorStatus, row.anchorStatus === 'verified' ? 'historical' : 'deferred');
      assert.equal('historicalAnchorStatus' in replayData, row.anchorStatus === 'verified');
      assert.equal('outboxStatus' in replayData, false);
      assert.equal('outboxErrorCode' in replayData, false);
    }

    const exported = await fetch(`${base}/api/privacy/export`, { headers });
    assert.equal(exported.status, 200);
    const data = (await exported.json() as { data: { exportData: { consents: Array<Record<string, unknown>> } } }).data.exportData;
    assert.deepEqual(data.consents.map((item) => item.anchorStatus), ['historical', 'deferred']);
    assert.equal(data.consents[0].historicalAnchorStatus, 'verified');
    assert.equal('evidence' in data.consents[0], false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await closePool();
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  }
});
