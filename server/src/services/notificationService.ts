import { getPool } from '../db/pool.js';
import type { PoolClient } from 'pg';
import { sendSMS, redactErrorMessage, GENERIC_SMS_TEMPLATES } from './eMessageService.js';

export const GENERIC_NOTIFICATION_TEMPLATES: Record<string, string> = {
  coordination_update: 'A coordination update is available for your case. Sign in to eBuhay to review your case.',
  withdrawal_update: 'A case participation status was updated. Sign in to eBuhay to review.',
  appointment_scheduled: 'An appointment status has been updated. Please sign in to eBuhay to review.',
  team_message: 'You have a new coordination message from your care team. Sign in to eBuhay to reply.',
  action_required: 'Action is requested for your coordination record. Please sign in to eBuhay.',
  blood_request_update: 'A blood coordination update is available. Sign in to eBuhay to review.',
  match_update: 'A coordination match proposal status has changed. Sign in to eBuhay to review.',
  consent_recorded: 'A coordination consent action has been recorded. Sign in to eBuhay to review.',
};

export const MAX_NOTIFICATION_ATTEMPTS = 5;

export const notificationRetryDelayMs = (attempt: number) =>
  Math.min(300_000, 1000 * 2 ** Math.min(Math.max(attempt - 1, 0), 6));

export type NotificationRecordInput = {
  recipientAccountId: string;
  template: string;
  safeReference?: string | null;
  channel?: 'in_app' | 'external_sms' | 'emessage';
};

export async function recordNotification(
  input: NotificationRecordInput,
  clientOrPool?: PoolClient | ReturnType<typeof getPool>
) {
  const executor = clientOrPool ?? getPool();
  const channel = input.channel ?? 'in_app';
  const template = GENERIC_NOTIFICATION_TEMPLATES[input.template]
    ? input.template
    : 'coordination_update';

  if (channel === 'in_app') {
    const res = await executor.query(
      `INSERT INTO notifications(recipient_account_id, template, safe_reference, channel, delivery_status, delivered_at)
       VALUES ($1, $2, $3, 'in_app', 'delivered', now())
       RETURNING id, recipient_account_id AS "recipientAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, delivered_at AS "deliveredAt", created_at AS "createdAt"`,
      [input.recipientAccountId, template, input.safeReference ?? null]
    );
    return res.rows[0];
  }

  // External channel: verify consent
  const prefRes = await executor.query(
    `SELECT sms_consent AS "smsConsent", phone_number AS "phoneNumber"
     FROM notification_preferences WHERE account_id=$1`,
    [input.recipientAccountId]
  );
  const pref = prefRes.rows[0];
  const hasConsent = Boolean(pref?.smsConsent && pref?.phoneNumber);

  if (!hasConsent) {
    // Fail-safe: without consent, channel is recorded as suppressed
    const res = await executor.query(
      `INSERT INTO notifications(recipient_account_id, template, safe_reference, channel, delivery_status, last_error)
       VALUES ($1, $2, $3, $4, 'suppressed', 'consent_required')
       RETURNING id, recipient_account_id AS "recipientAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, last_error AS "lastError", created_at AS "createdAt"`,
      [input.recipientAccountId, template, input.safeReference ?? null, channel]
    );
    return res.rows[0];
  }

  const res = await executor.query(
    `INSERT INTO notifications(recipient_account_id, template, safe_reference, channel, delivery_status, attempts)
     VALUES ($1, $2, $3, $4, 'pending', 0)
     RETURNING id, recipient_account_id AS "recipientAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, created_at AS "createdAt"`,
    [input.recipientAccountId, template, input.safeReference ?? null, channel]
  );
  return res.rows[0];
}

export async function dispatchExternalNotification(
  notificationId: string,
  clientOrPool?: PoolClient | ReturnType<typeof getPool>
) {
  const pool = getPool();
  const client = clientOrPool ?? (await pool.connect());
  const ownClient = !clientOrPool;

  try {
    const notifRes = await client.query(
      `SELECT n.id, n.recipient_account_id, n.template, n.channel, n.delivery_status, n.attempts,
              p.sms_consent, p.phone_number
       FROM notifications n
       LEFT JOIN notification_preferences p ON p.account_id = n.recipient_account_id
       WHERE n.id = $1`,
      [notificationId]
    );

    if (!notifRes.rowCount) return { success: false, error: 'not_found' };
    const row = notifRes.rows[0];

    if (row.delivery_status === 'delivered') return { success: true, delivered: true };
    if (row.delivery_status === 'suppressed') return { success: false, suppressed: true };

    if (!row.sms_consent || !row.phone_number) {
      // Consent was revoked or not present
      await client.query(
        `UPDATE notifications SET delivery_status='suppressed', last_error='consent_revoked', updated_at=now() WHERE id=$1`,
        [notificationId]
      );
      await client.query(
        `INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, error_code)
         VALUES ($1, $2, 'suppressed', 'consent_revoked')
         ON CONFLICT (notification_id, attempt_number) DO NOTHING`,
        [notificationId, row.attempts + 1]
      );
      return { success: false, suppressed: true };
    }

    const nextAttempt = row.attempts + 1;
    if (nextAttempt > MAX_NOTIFICATION_ATTEMPTS) {
      await client.query(
        `UPDATE notifications SET delivery_status='failed', last_error='max_attempts_exceeded', updated_at=now() WHERE id=$1`,
        [notificationId]
      );
      return { success: false, error: 'max_attempts_exceeded', terminal: true };
    }

    const message = GENERIC_SMS_TEMPLATES[row.template] ?? GENERIC_NOTIFICATION_TEMPLATES[row.template] ?? 'You have a new update in eBuhay.';
    const result = await sendSMS(row.phone_number, message);

    if (result.success) {
      await client.query(
        `UPDATE notifications
         SET delivery_status='delivered', provider_reference=$2, delivered_at=now(), last_error=NULL, attempts=$3, updated_at=now()
         WHERE id=$1`,
        [notificationId, result.message_id ?? null, nextAttempt]
      );
      await client.query(
        `INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, provider_reference)
         VALUES ($1, $2, 'delivered', $3)
         ON CONFLICT (notification_id, attempt_number) DO NOTHING`,
        [notificationId, nextAttempt, result.message_id ?? null]
      );
      return { success: true, delivered: true, providerReference: result.message_id };
    } else {
      const redacted = redactErrorMessage(result.error);
      const isFinal = nextAttempt >= MAX_NOTIFICATION_ATTEMPTS;
      const nextRetry = isFinal ? null : new Date(Date.now() + notificationRetryDelayMs(nextAttempt));

      await client.query(
        `UPDATE notifications
         SET delivery_status='failed', last_error=$2, next_retry_at=$3, attempts=$4, updated_at=now()
         WHERE id=$1`,
        [notificationId, redacted, nextRetry, nextAttempt]
      );
      await client.query(
        `INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, error_code)
         VALUES ($1, $2, 'failed', $3)
         ON CONFLICT (notification_id, attempt_number) DO NOTHING`,
        [notificationId, nextAttempt, redacted]
      );
      return { success: false, error: redacted, attempts: nextAttempt };
    }
  } finally {
    if (ownClient && 'release' in client) (client as PoolClient).release();
  }
}

export async function runNotificationBatch(options: { batchSize?: number; now?: Date } = {}) {
  const pool = getPool();
  const limit = options.batchSize ?? 25;
  const now = options.now ?? new Date();

  const pending = await pool.query(
    `SELECT id FROM notifications
     WHERE channel IN ('external_sms', 'emessage')
       AND delivery_status IN ('pending', 'failed')
       AND (next_retry_at IS NULL OR next_retry_at <= $1)
       AND attempts < $2
     ORDER BY created_at ASC
     LIMIT $3`,
    [now, MAX_NOTIFICATION_ATTEMPTS, limit]
  );

  let delivered = 0;
  let failed = 0;
  let suppressed = 0;

  for (const row of pending.rows) {
    const res = await dispatchExternalNotification(row.id);
    if (res.delivered) delivered += 1;
    else if (res.suppressed) suppressed += 1;
    else failed += 1;
  }

  return { leased: pending.rows.length, delivered, failed, suppressed };
}
