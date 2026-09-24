import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import type { Pool } from 'pg';
import { setPool, closePool } from '../src/db/pool.js';
import { createCitizenPlatformRouter } from '../src/routes/platform.js';
import { ALLOWED_NOTIFICATION_PURPOSES, dispatchExternalNotification } from '../src/services/notificationService.js';
import { GENERIC_SMS_TEMPLATES, setMockSmsHandler, resetMockSmsHandler } from '../src/services/eMessageService.js';

test('Citizen SMS opt-in uses only the current eGovPH mobile and revocation stops sends', async () => {
  assert.deepEqual([...ALLOWED_NOTIFICATION_PURPOSES].sort(), ['action_required', 'application_status_update', 'appointment_scheduled']);
  assert.deepEqual(Object.keys(GENERIC_SMS_TEMPLATES).sort(), [...ALLOWED_NOTIFICATION_PURPOSES].sort());
  assert.ok(Object.values(GENERIC_SMS_TEMPLATES).every((body) => !/https?:|kidney|blood|patient|case/i.test(body)));
  assert.ok(Object.values(GENERIC_SMS_TEMPLATES).every((body) => body.startsWith('[eBuhay demo]') && body.includes('simulated')));
  const accountId = '00000000-0000-4000-8000-000000000001';
  const mobile = '+639171234567';
  let consent = false;
  let preferredPhone: string | null = null;
  let smsCalls = 0;
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
      return { rowCount: 1, rows: [{ id: 'notification-1', recipient_account_id: accountId, actor_account_id: accountId, template: 'appointment_scheduled', safe_reference: 'case-1', channel: 'external_sms', attempts: 0, sms_consent: true, phone_number: null }] };
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
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    resetMockSmsHandler();
    await closePool();
  }
});
