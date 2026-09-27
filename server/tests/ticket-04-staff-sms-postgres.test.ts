import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { validateIsolatedTestDatabaseTargets } from '../src/services/releaseEvidenceService.js';

const testDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(testDir, '../.env') });
validateIsolatedTestDatabaseTargets();

const directUrl = process.env.TEST_DATABASE_DIRECT_URL;
if (!directUrl) throw new Error('TEST_DATABASE_DIRECT_URL is required');

const previousEnv = { NODE_ENV: process.env.NODE_ENV, EBUHAY_MODE: process.env.EBUHAY_MODE, COOKIE_SECURE: process.env.COOKIE_SECURE, ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS };
process.env.NODE_ENV = 'test';
process.env.EBUHAY_MODE = 'synthetic';
process.env.COOKIE_SECURE = 'false';
process.env.ALLOWED_ORIGINS = 'http://localhost:3000';

import { setPool, closePool } from '../src/db/pool.js';
import { createApp } from '../src/app.js';
import { setMockSmsHandler, resetMockSmsHandler, GENERIC_SMS_TEMPLATES } from '../src/services/eMessageService.js';
import { dispatchExternalNotification, recordNotification } from '../src/services/notificationService.js';

const pool = new Pool({ connectionString: directUrl, max: 6 });
setPool(pool);

const app = createApp({
  config: {
    mode: 'synthetic',
    databaseUrl: directUrl,
    port: 0,
    shutdownTimeoutMs: 1000,
    allowedOrigins: ['http://localhost:3000'],
  },
});

const testKey = `tk4-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
const sessionToken = crypto.randomBytes(32).toString('base64url');
const sessionHash = crypto.createHash('sha256').update(sessionToken).digest();

const hospitalId = crypto.randomUUID();
const serviceId = crypto.randomUUID();
const coordinatorId = crypto.randomUUID();
const reviewerId = crypto.randomUUID();
const recipientAccountId = crypto.randomUUID();
const donorAccountId = crypto.randomUUID();
const recipientCaseId = crypto.randomUUID();
const donorCaseId = crypto.randomUUID();
const recipientEpisodeId = crypto.randomUUID();
const donorEpisodeId = crypto.randomUUID();
const grantId = crypto.randomUUID();

let server: Server;
let baseUrl = '';

test.before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  await pool.query(`INSERT INTO hospitals(id, name, namespace, synthetic) VALUES($1, $2, $3, true)`,
    [hospitalId, `Hospital ${testKey}`, `${testKey}-hosp`]);
  await pool.query(`INSERT INTO services(id, hospital_id, code, name) VALUES($1, $2, 'kidney', $3)`,
    [serviceId, hospitalId, `${testKey}-kidney`]);

  await pool.query(`INSERT INTO accounts(id, login_identity, display_name, role, service_scope, hospital_id, status) VALUES($1, $2, 'Coord', 'coordinator', ARRAY['kidney']::text[], $3, 'active')`,
    [coordinatorId, `${testKey}-coord`, hospitalId]);
  await pool.query(`INSERT INTO accounts(id, login_identity, display_name, role, service_scope, hospital_id, status) VALUES($1, $2, 'Doc', 'doctor', ARRAY['kidney']::text[], $3, 'active')`,
    [reviewerId, `${testKey}-rev`, hospitalId]);
  await pool.query(`INSERT INTO pair_reviewer_grants(id, account_id, hospital_id, service_id, granted_by) VALUES($1, $2, $3, $4, $5)`,
    [grantId, reviewerId, hospitalId, serviceId, coordinatorId]);
  await pool.query(`INSERT INTO sessions(account_id, token_hash, expires_at, last_seen_at) VALUES($1, $2, now() + interval '8 hours', now())`,
    [coordinatorId, sessionHash]);

  await pool.query(`INSERT INTO accounts(id, login_identity, display_name, role, status) VALUES($1, $2, 'Recipient', 'citizen', 'active')`,
    [recipientAccountId, `${testKey}-rec`]);
  await pool.query(`INSERT INTO citizen_cases(id, account_id, hospital_id, service_id, role, status, participation_intent) VALUES($1, $2, $3, $4, 'recipient', 'active', 'organ')`,
    [recipientCaseId, recipientAccountId, hospitalId, serviceId]);
  await pool.query(`INSERT INTO episodes(id, case_id, lifecycle, participation, version) VALUES($1, $2, 'active', 'active', 1)`,
    [recipientEpisodeId, recipientCaseId]);
  await pool.query(`INSERT INTO recipient_intakes(episode_id, request_type, declared_blood_group, requested_organ, urgency, state, version) VALUES($1, 'organ', 'O+', 'kidney', 'routine', 'active', 1)`,
    [recipientEpisodeId]);
  await pool.query(`INSERT INTO hospital_linkages(case_id, episode_id, hospital_reference, state, version) VALUES($1, $2, $3, 'verified', 1)`,
    [recipientCaseId, recipientEpisodeId, `${testKey}-link-rec`]);
  await pool.query(`INSERT INTO notification_preferences(account_id, sms_consent, phone_number) VALUES($1, true, '+639170000001')`,
    [recipientAccountId]);
  await pool.query(`INSERT INTO egov_identities(account_id, uniqid, provider, profile) VALUES($1, $2, 'egovph', '{"mobile":"+639170000001"}'::jsonb)`,
    [recipientAccountId, `${testKey}-egov-rec`]);

  await pool.query(`INSERT INTO accounts(id, login_identity, display_name, role, status) VALUES($1, $2, 'Donor', 'citizen', 'active')`,
    [donorAccountId, `${testKey}-don`]);
  await pool.query(`INSERT INTO citizen_cases(id, account_id, hospital_id, service_id, role, status, participation_intent) VALUES($1, $2, $3, $4, 'donor', 'active', 'organ')`,
    [donorCaseId, donorAccountId, hospitalId, serviceId]);
  await pool.query(`INSERT INTO episodes(id, case_id, lifecycle, participation, version) VALUES($1, $2, 'active', 'active', 1)`,
    [donorEpisodeId, donorCaseId]);
  await pool.query(`INSERT INTO donor_intakes(episode_id, declared_blood_group, pledged_organs, availability, state, version) VALUES($1, 'O+', ARRAY['kidney']::text[], 'available', 'active', 1)`,
    [donorEpisodeId]);
  await pool.query(`INSERT INTO hospital_linkages(case_id, episode_id, hospital_reference, state, version) VALUES($1, $2, $3, 'verified', 1)`,
    [donorCaseId, donorEpisodeId, `${testKey}-link-don`]);
  await pool.query(`INSERT INTO notification_preferences(account_id, sms_consent, phone_number) VALUES($1, true, '+639170000002')`,
    [donorAccountId]);
  await pool.query(`INSERT INTO egov_identities(account_id, uniqid, provider, profile) VALUES($1, $2, 'egovph', '{"mobile":"+639170000099"}'::jsonb)`,
    [donorAccountId, `${testKey}-egov-don`]);
});

test.after(async () => {
  resetMockSmsHandler();

  try {
    await pool.query(`DELETE FROM audit_events WHERE actor_account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM notification_delivery_attempts WHERE notification_id IN (SELECT id FROM notifications WHERE recipient_account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1))`, [`${testKey}%`]);
    await pool.query(`DELETE FROM notifications WHERE recipient_account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM notification_preferences WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM egov_identities WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM pair_proposals WHERE selected_by IN (SELECT id FROM accounts WHERE login_identity LIKE $1) OR reviewer_account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM recipient_intakes WHERE episode_id IN (SELECT id FROM episodes WHERE case_id IN (SELECT id FROM citizen_cases WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)))`, [`${testKey}%`]);
    await pool.query(`DELETE FROM donor_intakes WHERE episode_id IN (SELECT id FROM episodes WHERE case_id IN (SELECT id FROM citizen_cases WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)))`, [`${testKey}%`]);
    await pool.query(`DELETE FROM hospital_linkages WHERE case_id IN (SELECT id FROM citizen_cases WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1))`, [`${testKey}%`]);
    await pool.query(`DELETE FROM episodes WHERE case_id IN (SELECT id FROM citizen_cases WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1))`, [`${testKey}%`]);
    await pool.query(`DELETE FROM citizen_cases WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM pair_reviewer_grants WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1) OR granted_by IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE login_identity LIKE $1)`, [`${testKey}%`]);
    await pool.query(`DELETE FROM accounts WHERE login_identity LIKE $1`, [`${testKey}%`]);
    await pool.query(`DELETE FROM services WHERE name LIKE $1`, [`${testKey}%`]);
    await pool.query(`DELETE FROM hospitals WHERE namespace LIKE $1`, [`${testKey}%`]);

    const accLeft = await pool.query(`SELECT count(*)::int AS count FROM accounts WHERE login_identity LIKE $1`, [`${testKey}%`]);
    assert.equal(accLeft.rows[0].count, 0, 'Scoped accounts cleanup verified');
    const hospLeft = await pool.query(`SELECT count(*)::int AS count FROM hospitals WHERE namespace LIKE $1`, [`${testKey}%`]);
    assert.equal(hospLeft.rows[0].count, 0, 'Scoped hospitals cleanup verified');
  } finally {
    try { if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
    finally {
      await closePool();
      for (const [name, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[name]; else process.env[name] = value;
      }
    }
  }
});

test('Ticket 04: Staff HTTP candidate select enqueues external_sms with consent/SSO SQL filter, double-dispatch, and audit privacy', async () => {
  let outboundSmsCount = 0;
  let sentMessageBody = '';
  setMockSmsHandler(async (num, msg) => {
    assert.equal(num, '+639170000001');
    outboundSmsCount++;
    sentMessageBody = msg;
    return { success: true, status: 'accepted', message_id: `provider-ack-${testKey}` };
  });

  const selectRes = await fetch(`${baseUrl}/api/hospital/candidates/${recipientEpisodeId}:${donorEpisodeId}/select`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
      cookie: `ebuhay_session=${encodeURIComponent(sessionToken)}`,
    },
    body: JSON.stringify({
      reviewerAccountId: reviewerId,
      targetVersion: '1:1',
      idempotencyKey: `idem-sel-${testKey}`,
    }),
  });

  assert.equal(selectRes.status, 201, 'Coordinator select endpoint succeeds with 201');
  const selectData = (await selectRes.json()) as { data: { id: string } };
  const pairId = selectData.data.id;
  assert.ok(pairId, 'Pair proposal ID returned');
  assert.equal(outboundSmsCount, 0, 'Zero SMS network dispatches occur during enqueue');

  const pendingSms = await pool.query(
    `SELECT id, recipient_account_id, actor_account_id, template, safe_reference, channel, delivery_status, delivered_at
     FROM notifications WHERE safe_reference = $1 AND channel = 'external_sms'`,
    [pairId],
  );
  assert.equal(pendingSms.rowCount, 1, 'Only 1 pending external_sms row inserted');
  const smsRow = pendingSms.rows[0];
  assert.equal(smsRow.recipient_account_id, recipientAccountId, 'Attributed to consenting recipient');
  assert.equal(smsRow.actor_account_id, coordinatorId, 'Attributed to actor coordinator');
  assert.equal(smsRow.template, 'application_status_update', 'Approved purpose template');
  assert.equal(smsRow.safe_reference, pairId, 'Safe reference to selected pair');
  assert.equal(smsRow.delivery_status, 'pending', 'Persisted as pending');
  assert.equal(smsRow.delivered_at, null, 'delivered_at is null upon enqueue');

  const donorSms = await pool.query(
    `SELECT count(*)::int AS count FROM notifications WHERE recipient_account_id = $1 AND channel = 'external_sms'`,
    [donorAccountId],
  );
  assert.equal(donorSms.rows[0].count, 0, 'Opted-in donor with mismatched SSO mobile excluded from external_sms');

  const [d1, d2] = await Promise.all([
    dispatchExternalNotification(smsRow.id),
    dispatchExternalNotification(smsRow.id),
  ]);
  assert.equal(outboundSmsCount, 1, 'Double dispatch invokes provider mock exactly once');
  const acceptedResult = d1.success ? d1 : d2;
  assert.equal(acceptedResult.status, 'accepted', 'Dispatch outcome status is accepted');
  assert.equal(acceptedResult.delivered, false, 'Accepted delivery claim is truthful');
  assert.equal(sentMessageBody, GENERIC_SMS_TEMPLATES.application_status_update);

  const updatedNotif = await pool.query(
    `SELECT delivery_status, delivered_at, provider_reference, attempts FROM notifications WHERE id = $1`,
    [smsRow.id],
  );
  assert.equal(updatedNotif.rows[0].delivery_status, 'accepted');
  assert.equal(updatedNotif.rows[0].delivered_at, null, 'delivered_at remains null for accepted status');
  assert.equal(updatedNotif.rows[0].provider_reference, `provider-ack-${testKey}`);
  assert.equal(updatedNotif.rows[0].attempts, 1);

  const attempts = await pool.query(
    `SELECT attempt_number, status, provider_reference FROM notification_delivery_attempts WHERE notification_id = $1`,
    [smsRow.id],
  );
  assert.equal(attempts.rowCount, 1);
  assert.equal(attempts.rows[0].status, 'accepted');
  assert.equal(attempts.rows[0].provider_reference, `provider-ack-${testKey}`);

  const repeatRes = await dispatchExternalNotification(smsRow.id);
  assert.equal(repeatRes.status, 'accepted');
  assert.equal(outboundSmsCount, 1, 'Repeat dispatch does not resend SMS');

  const unavailNotif = await recordNotification({
    recipientAccountId,
    actorAccountId: coordinatorId,
    template: 'application_status_update',
    channel: 'external_sms',
    safeReference: pairId,
  });
  const secretErrorToken = 'SECRET_TOKEN_FOR_REDACTION';
  setMockSmsHandler(async () => ({
    success: false,
    error: `503 Upstream failure token=${secretErrorToken}`,
    status: 'unavailable',
  }));
  const unavailRes = await dispatchExternalNotification(unavailNotif.id);
  assert.equal(unavailRes.success, false);
  assert.equal(unavailRes.status, 'unavailable');
  assert.equal(unavailRes.error, 'upstream_error', 'Upstream secret error is redacted to upstream_error');

  const unavailRow = await pool.query(`SELECT delivery_status, last_error FROM notifications WHERE id = $1`, [unavailNotif.id]);
  assert.equal(unavailRow.rows[0].delivery_status, 'unavailable');
  assert.equal(unavailRow.rows[0].last_error, 'upstream_error');

  await pool.query(`UPDATE notification_preferences SET sms_consent = false WHERE account_id = $1`, [recipientAccountId]);
  const suppressedNotif = await recordNotification({
    recipientAccountId,
    actorAccountId: coordinatorId,
    template: 'application_status_update',
    channel: 'external_sms',
    safeReference: pairId,
  });
  assert.equal(suppressedNotif.deliveryStatus, 'suppressed');
  assert.equal(suppressedNotif.lastError, 'consent_required');

  const audits = await pool.query(`SELECT * FROM audit_events WHERE actor_account_id = $1 AND action='notification.provider_result'`, [coordinatorId]);
  assert.equal(audits.rowCount, 2, 'One audit event per provider attempt');
  for (const row of audits.rows) {
    assert.equal(row.actor_account_id, coordinatorId);
    assert.equal(row.action, 'notification.provider_result');
    assert.equal(row.source, 'egov.emessage');
    assert.equal(row.target_reference, row.request_reference);
    assert.ok([smsRow.id, unavailNotif.id].includes(row.request_reference));
    assert.ok(Number.isFinite(new Date(row.created_at).getTime()));
    assert.equal(row.details.feature, 'emessage');
    assert.equal(row.details.purpose, 'application_status_update');
    assert.equal(row.details.providerStatus, row.request_reference === smsRow.id ? 'accepted' : 'unavailable');
    if (row.request_reference === smsRow.id) assert.equal(row.details.providerCorrelationId, `provider-ack-${testKey}`);
    const detailsStr = JSON.stringify(row);
    assert.equal(detailsStr.includes('+639170000001'), false, 'Audit excludes unmasked mobile phone');
    assert.equal(detailsStr.includes('09170000001'), false, 'Audit excludes local mobile phone');
    assert.equal(detailsStr.includes(sentMessageBody), false, 'Audit excludes SMS body text');
    assert.equal(detailsStr.includes(secretErrorToken), false, 'Audit excludes provider error secrets');
    assert.equal(detailsStr.includes('token='), false, 'Audit excludes provider credential keys');
  }
});
