import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import express from 'express';
import type { Pool } from 'pg';
import { setPool, closePool } from '../src/db/pool.js';
import { createCitizenPlatformRouter } from '../src/routes/platform.js';
import rebaselineRouter from '../src/routes/rebaseline.js';
import { ALLOWED_NOTIFICATION_PURPOSES, dispatchExternalNotification } from '../src/services/notificationService.js';
import { GENERIC_SMS_TEMPLATES, setMockSmsHandler, resetMockSmsHandler } from '../src/services/eMessageService.js';

test('Citizen SMS opt-in uses only the current eGovPH mobile and revocation stops sends', async () => {
  assert.deepEqual([...ALLOWED_NOTIFICATION_PURPOSES].sort(), ['action_required', 'application_status_update', 'appointment_scheduled']);
  assert.deepEqual(Object.keys(GENERIC_SMS_TEMPLATES).sort(), [...ALLOWED_NOTIFICATION_PURPOSES].sort());
  assert.ok(Object.values(GENERIC_SMS_TEMPLATES).every((body) => !/https?:|kidney|blood|patient|case/i.test(body)));
  assert.ok(Object.values(GENERIC_SMS_TEMPLATES).every((body) => body.startsWith('[eBuhay demo]') && body.includes('simulated')));
  const accountId = '00000000-0000-4000-8000-000000000001';
  const acceptedId = '00000000-0000-4000-8000-000000000002';
  const unavailableId = '00000000-0000-4000-8000-000000000003';
  const mobile = '+639171234567';
  let consent = false;
  let preferredPhone: string | null = null;
  let smsCalls = 0;
  let latestId = acceptedId;
  let latestStatus: string | null = null;
  const query = async (statement: string | { text: string; values: unknown[] }, values: unknown[] = []) => {
    const sql = typeof statement === 'string' ? statement : statement.text;
    if (typeof statement !== 'string') values = statement.values ?? values;
    if (sql.startsWith('UPDATE sessions s SET last_seen_at')) return { rowCount: 1, rows: [{ id: accountId, role: 'citizen', display_name: 'Maria Santos', service_scope: [], hospital_id: null }] };
    if (sql.includes('FROM accounts a LEFT JOIN notification_preferences')) return { rowCount: 1, rows: [{ smsConsent: consent, phoneNumber: preferredPhone, verifiedMobile: mobile }] };
    if (sql.includes("SELECT profile->>'mobile' AS mobile FROM egov_identities")) return { rowCount: 1, rows: [{ mobile }] };
    if (sql.startsWith('INSERT INTO notification_preferences')) {
      consent = Boolean(values[1]);
      preferredPhone = values[2] as string | null;
      return { rowCount: 1, rows: [{ smsConsent: consent, phoneNumber: preferredPhone }] };
    }
    if (sql.startsWith('WITH claimed AS')) {
      assert.match(sql, /e\.profile->>'mobile'=p\.phone_number/);
      return { rowCount: 1, rows: [{ id: values[0], recipient_account_id: accountId, actor_account_id: accountId, template: 'appointment_scheduled', safe_reference: 'case-1', channel: 'external_sms', attempts: 0, sms_consent: consent, phone_number: preferredPhone }] };
    }
    if (sql.startsWith('WITH updated AS')) {
      latestId = values[0] as string;
      latestStatus = values[3] as string;
      return { rowCount: 1, rows: [] };
    }
    if (sql.includes('FROM notifications WHERE recipient_account_id=')) {
      assert.equal(values[0], accountId);
      return { rowCount: latestStatus ? 1 : 0, rows: latestStatus ? [{ id: latestId, template: 'appointment_scheduled', channel: 'external_sms', deliveryStatus: latestStatus, createdAt: '2026-09-25T00:00:00.000Z' }] : [] };
    }
    if (sql.includes('FROM notifications WHERE id=')) {
      assert.deepEqual(values, [latestId, accountId]);
      return { rowCount: 1, rows: [{ id: latestId, template: 'appointment_scheduled', channel: 'external_sms', deliveryStatus: latestStatus }] };
    }
    if (sql.startsWith('UPDATE notifications SET delivery_status') || sql.startsWith('INSERT INTO notification_delivery_attempts')) return { rowCount: 1, rows: [] };
    throw new Error(`Unexpected database operation: ${sql.slice(0, 60)}`);
  };
  const pool = { query, end: async () => {} } as unknown as Pool;
  setPool(pool);
  setMockSmsHandler(async () => { smsCalls++; return { success: true, status: 'accepted' }; });
  const app = express();
  app.use(express.json());
  app.use('/api/v1', createCitizenPlatformRouter('synthetic'));
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/v1/notifications/preferences`;
    const headers = { origin: 'http://localhost:3000', cookie: `ebuhay_session=${'a'.repeat(43)}`, 'content-type': 'application/json' };
    const anonymous = await fetch(url, { method: 'PUT', headers: { origin: headers.origin, 'content-type': headers['content-type'] }, body: JSON.stringify({ smsConsent: true }) });
    assert.equal(anonymous.status, 401);
    const crossOrigin = await fetch(url, { method: 'PUT', headers: { ...headers, origin: 'https://untrusted.example' }, body: JSON.stringify({ smsConsent: true }) });
    assert.equal(crossOrigin.status, 403);
    assert.equal(consent, false);
    const initial = await fetch(url, { headers });
    assert.equal((await initial.json() as { data: { smsConsent: boolean } }).data.smsConsent, false);
    const manual = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ smsConsent: true, phoneNumber: mobile }) });
    assert.equal(manual.status, 422);
    const optIn = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ smsConsent: true }) });
    assert.equal(optIn.status, 200, await optIn.clone().text());
    assert.equal(preferredPhone, mobile);
    assert.equal((await optIn.json() as { data: { smsConsent: boolean } }).data.smsConsent, true);
    const revoke = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ smsConsent: false }) });
    assert.equal(revoke.status, 200);
    assert.deepEqual((await revoke.json() as { data: { smsConsent: boolean; phoneNumberMasked: string } }).data, { smsConsent: false, phoneNumberMasked: '+639****4567' });
    assert.equal(consent, false);
    assert.equal(preferredPhone, null);
    const dispatch = await dispatchExternalNotification('notification-1', pool);
    assert.deepEqual(dispatch, { success: false, suppressed: true, error: 'consent_revoked' });
    assert.equal(smsCalls, 0);
    const reenable = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ smsConsent: true }) });
    assert.equal(reenable.status, 200);
    assert.equal((await reenable.json() as { data: { smsConsent: boolean } }).data.smsConsent, true);
    const submitted = await dispatchExternalNotification(acceptedId, pool);
    assert.equal(submitted.status, 'accepted');
    assert.equal(submitted.delivered, false);
    assert.equal(smsCalls, 1);
    const history = await fetch(url.replace('/preferences', '?format=page'), { headers });
    assert.equal(history.status, 200);
    const body = await history.json() as { data: { items: Array<{ deliveryStatus: string; summary: string }> } };
    assert.equal(body.data.items[0]?.deliveryStatus, 'accepted');
    assert.match(body.data.items[0]?.summary ?? '', /simulated/i);
    assert.doesNotMatch(JSON.stringify(body), /phone|provider_reference|deliveredAt/i);
    const detail = await fetch(url.replace('/preferences', `/${acceptedId}`), { headers });
    assert.equal(detail.status, 200);
    const detailBody = await detail.json() as { data: { deliveryStatus: string; summary: string } };
    assert.equal(detailBody.data.deliveryStatus, 'accepted');
    assert.match(detailBody.data.summary, /simulated/i);
    const publicSend = await fetch(url.replace('/preferences', '/dispatch'), { method: 'POST', headers, body: '{}' });
    assert.equal(publicSend.status, 404);
    setMockSmsHandler(async () => { smsCalls++; return { success: false, status: 'unavailable', error: 'provider-secret-token' }; });
    const failed = await dispatchExternalNotification(unavailableId, pool);
    assert.equal(failed.status, 'unavailable');
    assert.equal(smsCalls, 2);
    const failedHistory = await fetch(url.replace('/preferences', '?format=page'), { headers });
    assert.equal(failedHistory.status, 200);
    const failedHistoryBody = await failedHistory.json() as { data: { items: Array<{ deliveryStatus: string }> } };
    assert.equal(failedHistoryBody.data.items[0]?.deliveryStatus, 'unavailable');
    assert.doesNotMatch(JSON.stringify(failedHistoryBody), /provider-secret-token|deliveredAt/i);
    const failedDetail = await fetch(url.replace('/preferences', `/${unavailableId}`), { headers });
    assert.equal(failedDetail.status, 200);
    const failedDetailBody = await failedDetail.json() as { data: { deliveryStatus: string } };
    assert.equal(failedDetailBody.data.deliveryStatus, 'unavailable');
    assert.doesNotMatch(JSON.stringify(failedDetailBody), /provider-secret-token|deliveredAt/i);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    resetMockSmsHandler();
    await closePool();
  }
});

test('Staff candidate selection queues pending external_sms without outbound SMS dispatch', async () => {
  const coordinatorId = '00000000-0000-4000-8000-000000000010';
  const citizenId = '00000000-0000-4000-8000-000000000011';
  const hospitalId = '00000000-0000-4000-8000-000000000012';
  const wrongHospitalId = '00000000-0000-4000-8000-000000000013';
  const serviceId = '00000000-0000-4000-8000-000000000014';
  const reviewerId = '00000000-0000-4000-8000-000000000015';
  const recipientEpisodeId = '00000000-0000-4000-8000-000000000016';
  const donorEpisodeId = '00000000-0000-4000-8000-000000000017';
  const pairId = '00000000-0000-4000-8000-000000000018';

  const coordinatorToken = 'c'.repeat(43);
  const citizenToken = 'd'.repeat(43);
  const coordinatorHash = crypto.createHash('sha256').update(coordinatorToken).digest();
  const citizenHash = crypto.createHash('sha256').update(citizenToken).digest();

  let scenario: 'wrong_hospital' | 'wrong_service' | 'reviewer_denied' | 'success' = 'wrong_hospital';
  let notificationWrites = 0;
  let commits = 0;
  let rollbacks = 0;
  let smsCalls = 0;
  let queuedExternalSmsSql = '';
  let queuedExternalSmsValues: unknown[] = [];

  const client = {
    release: () => {},
    query: async (statement: string | { text: string; values: unknown[] }, values: unknown[] = []) => {
      const sql = typeof statement === 'string' ? statement : statement.text;
      if (typeof statement !== 'string') values = statement.values ?? values;
      if (sql === 'BEGIN') return { rowCount: 0, rows: [] };
      if (sql === 'ROLLBACK') { rollbacks++; return { rowCount: 0, rows: [] }; }
      if (sql === 'COMMIT') { commits++; return { rowCount: 0, rows: [] }; }
      if (sql.includes('FROM episodes re') && sql.includes('FOR UPDATE OF re,de,ri,di')) {
        return {
          rowCount: 1,
          rows: [{
            recipient_version: 1, donor_version: 1,
            recipient_account_id: '00000000-0000-4000-8000-000000000031',
            donor_account_id: '00000000-0000-4000-8000-000000000032',
            hospital_id: scenario === 'wrong_hospital' ? wrongHospitalId : hospitalId,
            service_id: serviceId,
            service_code: scenario === 'wrong_service' ? 'blood' : 'living-kidney',
          }],
        };
      }
      if (sql.includes('FROM pair_reviewer_grants')) {
        return { rowCount: scenario === 'reviewer_denied' ? 0 : 1, rows: scenario === 'reviewer_denied' ? [] : [{ ok: 1 }] };
      }
      if (sql.includes('FROM pair_proposals WHERE selected_by=$1 AND selection_idempotency_key=$2')) return { rowCount: 0, rows: [] };
      if (sql.includes('FROM pair_proposals') && sql.includes('state=ANY($1::text[])')) return { rowCount: 0, rows: [] };
      if (sql.startsWith('INSERT INTO pair_proposals')) {
        return { rowCount: 1, rows: [{ id: pairId, state: 'awaiting_citizen_acceptance', version: 1, reviewerAccountId: reviewerId }] };
      }
      if (sql.startsWith('INSERT INTO notifications') && sql.includes("'in_app'")) { notificationWrites++; return { rowCount: 1, rows: [] }; }
      if (sql.startsWith('INSERT INTO notifications') && sql.includes("'external_sms'")) {
        notificationWrites++;
        queuedExternalSmsSql = sql;
        queuedExternalSmsValues = values;
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected database operation: ${sql.slice(0, 60)}`);
    },
  };

  const pool = {
    connect: async () => client,
    query: async (statement: string | { text: string; values: unknown[] }, values: unknown[] = []) => {
      const sql = typeof statement === 'string' ? statement : statement.text;
      if (typeof statement !== 'string') values = statement.values ?? values;
      if (sql.startsWith('UPDATE sessions s SET last_seen_at')) {
        const hash = values[0] as Buffer;
        if (hash.equals(coordinatorHash)) {
          return { rowCount: 1, rows: [{ id: coordinatorId, role: 'coordinator', display_name: 'Coordinator Staff', service_scope: ['living-kidney'], hospital_id: hospitalId }] };
        }
        if (hash.equals(citizenHash)) {
          return { rowCount: 1, rows: [{ id: citizenId, role: 'citizen', display_name: 'Citizen User', service_scope: [], hospital_id: null }] };
        }
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected pool database operation: ${sql.slice(0, 60)}`);
    },
    end: async () => {},
  } as unknown as Pool;

  setPool(pool);
  setMockSmsHandler(async () => { smsCalls++; return { success: true, status: 'accepted' }; });
  const prevMode = process.env.EBUHAY_MODE;
  process.env.EBUHAY_MODE = 'synthetic';

  const app = express();
  app.use(express.json());
  app.use(rebaselineRouter);
  const server = app.listen(0);

  try {
    const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/hospital/candidates/${recipientEpisodeId}:${donorEpisodeId}/select`;
    const baseHeaders = { origin: 'http://localhost:3000', 'content-type': 'application/json' };
    const validBody = { reviewerAccountId: reviewerId, targetVersion: '1:1', idempotencyKey: 'idemp-select-00000001' };

    const anonymous = await fetch(url, { method: 'POST', headers: baseHeaders, body: JSON.stringify(validBody) });
    assert.equal(anonymous.status, 401);
    assert.equal(notificationWrites, 0);

    const citizen = await fetch(url, {
      method: 'POST',
      headers: { ...baseHeaders, cookie: `ebuhay_session=${citizenToken}` },
      body: JSON.stringify(validBody),
    });
    assert.equal(citizen.status, 422);
    assert.equal((await citizen.json() as { error: string }).error, 'validation_error');
    assert.equal(notificationWrites, 0);

    const coordinatorHeaders = { ...baseHeaders, cookie: `ebuhay_session=${coordinatorToken}` };

    scenario = 'wrong_hospital';
    const wrongHospital = await fetch(url, { method: 'POST', headers: coordinatorHeaders, body: JSON.stringify(validBody) });
    assert.equal(wrongHospital.status, 403);
    assert.equal(notificationWrites, 0);
    assert.equal(rollbacks, 1);

    scenario = 'wrong_service';
    const wrongService = await fetch(url, { method: 'POST', headers: coordinatorHeaders, body: JSON.stringify(validBody) });
    assert.equal(wrongService.status, 403);
    assert.equal(notificationWrites, 0);
    assert.equal(rollbacks, 2);

    scenario = 'reviewer_denied';
    const reviewerDenied = await fetch(url, { method: 'POST', headers: coordinatorHeaders, body: JSON.stringify(validBody) });
    assert.equal(reviewerDenied.status, 403);
    assert.equal((await reviewerDenied.json() as { message: string }).message, 'Reviewer is not permitted');
    assert.equal(notificationWrites, 0);
    assert.equal(rollbacks, 3);

    scenario = 'success';
    const success = await fetch(url, { method: 'POST', headers: coordinatorHeaders, body: JSON.stringify(validBody) });
    assert.equal(success.status, 201);
    const body = await success.json() as { success: boolean; data: { id: string; state: string } };
    assert.equal(body.success, true);
    assert.equal(body.data.id, pairId);
    assert.equal(body.data.state, 'awaiting_citizen_acceptance');
    assert.equal(notificationWrites, 2);
    assert.equal(commits, 1);
    assert.equal(smsCalls, 0);

    // Query-contract evidence only (not claiming Postgres engine validation of SQL predicates or transaction rollback):
    assert.deepEqual(queuedExternalSmsValues, [pairId, coordinatorId]);
    assert.match(queuedExternalSmsSql, /'application_status_update'/);
    assert.match(queuedExternalSmsSql, /'external_sms'/);
    assert.match(queuedExternalSmsSql, /'pending'/);
    assert.doesNotMatch(queuedExternalSmsSql, /'delivered'|'accepted'/);
    assert.match(queuedExternalSmsSql, /pref\.sms_consent\s*=\s*true/);
    assert.match(queuedExternalSmsSql, /pref\.phone_number\s*=\s*ei\.profile->>'mobile'/);
  } finally {
    if (prevMode === undefined) delete process.env.EBUHAY_MODE;
    else process.env.EBUHAY_MODE = prevMode;
    await new Promise<void>((resolve) => server.close(() => resolve()));
    resetMockSmsHandler();
    await closePool();
  }
});
