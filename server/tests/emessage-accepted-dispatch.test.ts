import assert from 'node:assert/strict';
import test from 'node:test';
import { dispatchExternalNotification } from '../src/services/notificationService.js';
import { GENERIC_SMS_TEMPLATES, resetMockSmsHandler, setMockSmsHandler } from '../src/services/eMessageService.js';

test('an accepted SMS request is persisted without a delivery claim or provider retry', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  let providerCalls = 0;
  let sentMessage = '';
  let claimed = false;
  const executor = {
    async query(sql: string, values: unknown[] = []) {
      if (sql.includes('WITH claimed AS')) {
        if (claimed) return { rowCount: 0, rows: [] };
        claimed = true;
        return { rowCount: 1, rows: [{
          id: 'request-1', recipient_account_id: 'citizen-1', actor_account_id: 'staff-1',
          template: 'appointment_scheduled', safe_reference: 'appointment-1',
          channel: 'emessage', attempts: 0, sms_consent: true, phone_number: '+639171234567',
        }] };
      }
      if (sql.includes('SELECT id, delivery_status')) {
        return { rowCount: 1, rows: [{ delivery_status: 'accepted', provider_reference: null, attempts: 1 }] };
      }
      writes.push({ sql, values });
      return { rowCount: 1, rows: [] };
    },
  };
  setMockSmsHandler(async (_number, message) => {
    providerCalls += 1;
    sentMessage = message;
    return { success: true, status: 'accepted' };
  });
  try {
    const first = await dispatchExternalNotification('request-1', executor as never);
    const second = await dispatchExternalNotification('request-1', executor as never);
    assert.equal(first.success, true);
    assert.equal(first.accepted, true);
    assert.equal(first.delivered, false);
    assert.equal(first.sent, false);
    assert.equal(second.status, 'accepted');
    assert.equal(providerCalls, 1);
    assert.equal(sentMessage, GENERIC_SMS_TEMPLATES.appointment_scheduled);
    assert.match(sentMessage, /demo.*simulated/i);
    const saved = writes.find((write) => write.sql.includes('UPDATE notifications'));
    assert.ok(saved);
    assert.equal(saved.values[3], 'accepted');
    assert.equal(saved.values[1], null);
    assert.match(saved.sql, /delivered_at=CASE WHEN \$4='delivered' THEN now\(\) ELSE NULL END/);
    assert.ok(writes.some((write) => write.sql.includes('INSERT INTO notification_delivery_attempts') && write.values[3] === 'accepted'));
  } finally {
    resetMockSmsHandler();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});

test('an unavailable SMS attempt stays unavailable and is not sent again automatically', async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  let status = 'pending';
  let providerCalls = 0;
  const writes: Array<{ sql: string; values: unknown[] }> = [];
  const executor = {
    async query(sql: string, values: unknown[] = []) {
      if (sql.includes('WITH claimed AS')) {
        if (status !== 'pending') return { rowCount: 0, rows: [] };
        status = 'sending';
        return { rowCount: 1, rows: [{
          id: 'request-2', recipient_account_id: 'citizen-1', actor_account_id: 'staff-1',
          template: 'appointment_scheduled', safe_reference: 'appointment-2',
          channel: 'emessage', attempts: 0, sms_consent: true, phone_number: '+639171234567',
        }] };
      }
      if (sql.includes('SELECT id, delivery_status')) return { rowCount: 1, rows: [{ delivery_status: status, last_error: 'delivery_failed', attempts: 1 }] };
      writes.push({ sql, values });
      if (sql.includes('UPDATE notifications') && values.length === 4) status = values[3] as string;
      return { rowCount: 1, rows: [] };
    },
  };
  setMockSmsHandler(async () => {
    providerCalls++;
    return { success: false, error: 'secret-token-xyz-123', status: 'unavailable' };
  });
  try {
    const first = await dispatchExternalNotification('request-2', executor as never);
    const second = await dispatchExternalNotification('request-2', executor as never);
    assert.deepEqual(first, { success: false, error: 'delivery_failed', status: 'unavailable', attempts: 1 });
    assert.deepEqual(second, { success: false, error: 'delivery_failed', status: 'unavailable', attempts: 1 });
    assert.equal(providerCalls, 1);
    const saved = writes.find((write) => write.sql.includes('UPDATE notifications'));
    assert.ok(saved);
    assert.match(saved.sql, /next_retry_at=NULL/);
    assert.deepEqual(saved.values, ['request-2', 'delivery_failed', 1, 'unavailable']);
    assert.ok(writes.some((write) => write.sql.includes('INSERT INTO notification_delivery_attempts') && write.values[3] === 'delivery_failed'));
    assert.doesNotMatch(JSON.stringify(writes), /secret-token-xyz-123/);
  } finally {
    resetMockSmsHandler();
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  }
});
