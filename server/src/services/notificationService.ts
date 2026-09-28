import { getPool } from "../db/pool.js";
import type { PoolClient } from "pg";
import {
  sendSMS,
  redactErrorMessage,
  GENERIC_SMS_TEMPLATES,
} from "./eMessageService.js";

export const GENERIC_NOTIFICATION_TEMPLATES: Record<string, string> = {
  coordination_update:
    "A coordination update is available for your case. Sign in to eBuhay to review your case.",
  application_status_update:
    "Your application status was updated. Sign in to eBuhay to review.",
  withdrawal_update:
    "A case participation status was updated. Sign in to eBuhay to review.",
  appointment_scheduled:
    "An appointment status has been updated. Please sign in to eBuhay to review.",
  team_message:
    "You have a new coordination message from your care team. Sign in to eBuhay to reply.",
  action_required:
    "Action is requested for your coordination record. Please sign in to eBuhay.",
  blood_request_update:
    "A blood coordination update is available. Sign in to eBuhay to review.",
  match_update:
    "A coordination match proposal status has changed. Sign in to eBuhay to review.",
  consent_recorded:
    "A coordination consent action has been recorded. Sign in to eBuhay to review.",
};

export const ALLOWED_NOTIFICATION_PURPOSES = Object.freeze(
  ["appointment_scheduled", "application_status_update", "action_required"],
);

export const MAX_NOTIFICATION_ATTEMPTS = 5;

export type NotificationRecordInput = {
  recipientAccountId: string;
  actorAccountId?: string | null;
  template: string;
  safeReference?: string | null;
  channel?: "in_app" | "external_sms" | "emessage";
};

export async function recordNotification(
  input: NotificationRecordInput,
  clientOrPool?: PoolClient | ReturnType<typeof getPool>,
) {
  const executor = clientOrPool ?? getPool();
  const channel = input.channel ?? "in_app";

  const knownTemplate = Boolean(GENERIC_NOTIFICATION_TEMPLATES[input.template]);
  const externalPurposeAllowed = ALLOWED_NOTIFICATION_PURPOSES.includes(input.template);
  if (!knownTemplate || (channel !== "in_app" && !externalPurposeAllowed)) {
    const res = await executor.query(
      `INSERT INTO notifications(recipient_account_id, actor_account_id, template, safe_reference, channel, delivery_status, last_error)
       VALUES ($1, $5, $2, $3, $4, 'suppressed', 'disallowed_purpose')
       RETURNING id, recipient_account_id AS "recipientAccountId", actor_account_id AS "actorAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, last_error AS "lastError", created_at AS "createdAt"`,
      [
        input.recipientAccountId,
        input.template,
        input.safeReference ?? null,
        channel,
        input.actorAccountId ?? null,
      ],
    );
    return res.rows[0];
  }

  const template = input.template;

  if (channel !== "in_app" && (!input.actorAccountId || !input.safeReference?.trim())) {
    const res = await executor.query(
      `INSERT INTO notifications(recipient_account_id, actor_account_id, template, safe_reference, channel, delivery_status, last_error)
       VALUES ($1, $2, $3, $4, $5, 'suppressed', 'audit_context_required')
       RETURNING id, recipient_account_id AS "recipientAccountId", actor_account_id AS "actorAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, last_error AS "lastError", created_at AS "createdAt"`,
      [input.recipientAccountId, input.actorAccountId ?? null, template, input.safeReference ?? null, channel],
    );
    return res.rows[0];
  }

  if (channel === "in_app") {
    const res = await executor.query(
      `INSERT INTO notifications(recipient_account_id, actor_account_id, template, safe_reference, channel, delivery_status, delivered_at)
       VALUES ($1, $4, $2, $3, 'in_app', 'delivered', now())
       RETURNING id, recipient_account_id AS "recipientAccountId", actor_account_id AS "actorAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, delivered_at AS "deliveredAt", created_at AS "createdAt"`,
      [input.recipientAccountId, template, input.safeReference ?? null, input.actorAccountId ?? null],
    );
    return res.rows[0];
  }

  // External channel: verify consent (default-off)
  const prefRes = await executor.query(
    `SELECT p.sms_consent AS "smsConsent", p.phone_number AS "phoneNumber",
       e.profile->>'mobile' AS "verifiedMobile"
     FROM notification_preferences p LEFT JOIN egov_identities e
       ON e.account_id=p.account_id AND e.provider='egovph'
     WHERE p.account_id=$1`,
    [input.recipientAccountId],
  );
  const pref = prefRes.rows[0];
  const hasConsent = Boolean(pref?.smsConsent && pref?.phoneNumber && pref.phoneNumber === pref.verifiedMobile);

  if (!hasConsent) {
    // Fail-safe: without consent, channel is recorded as suppressed
    const res = await executor.query(
      `INSERT INTO notifications(recipient_account_id, actor_account_id, template, safe_reference, channel, delivery_status, last_error)
       VALUES ($1, $5, $2, $3, $4, 'suppressed', 'consent_required')
       RETURNING id, recipient_account_id AS "recipientAccountId", actor_account_id AS "actorAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, last_error AS "lastError", created_at AS "createdAt"`,
      [
        input.recipientAccountId,
        template,
        input.safeReference ?? null,
        channel,
        input.actorAccountId,
      ],
    );
    return res.rows[0];
  }

  const res = await executor.query(
    `INSERT INTO notifications(recipient_account_id, actor_account_id, template, safe_reference, channel, delivery_status, attempts)
     VALUES ($1, $5, $2, $3, $4, 'pending', 0)
     RETURNING id, recipient_account_id AS "recipientAccountId", actor_account_id AS "actorAccountId", template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, created_at AS "createdAt"`,
    [input.recipientAccountId, template, input.safeReference ?? null, channel, input.actorAccountId],
  );
  return res.rows[0];
}

export async function dispatchExternalNotification(
  notificationId: string,
  clientOrPool?: PoolClient | ReturnType<typeof getPool>,
) {
  const pool = getPool();
  const client = clientOrPool ?? (await pool.connect());
  const ownClient = !clientOrPool;

  try {
    // Atomically claim only pending notifications as 'sending' before network I/O.
    // Concurrent dispatch will allow only one caller to transition 'pending' -> 'sending'.
    const claimRes = await client.query(
      `WITH claimed AS (
         UPDATE notifications
         SET delivery_status = 'sending', updated_at = now()
         WHERE id = $1 AND delivery_status = 'pending'
         RETURNING id, recipient_account_id, actor_account_id, template, safe_reference, channel, delivery_status, attempts
       )
       SELECT c.id, c.recipient_account_id, c.actor_account_id, c.template, c.safe_reference, c.channel,
              c.delivery_status, c.attempts,
              p.sms_consent,
              CASE WHEN e.provider='egovph' AND e.profile->>'mobile'=p.phone_number THEN p.phone_number ELSE NULL END AS phone_number
       FROM claimed c
       LEFT JOIN notification_preferences p ON p.account_id = c.recipient_account_id
       LEFT JOIN egov_identities e ON e.account_id=c.recipient_account_id AND e.provider='egovph'`,
      [notificationId],
    );

    if (!claimRes.rowCount) {
      const existingRes = await client.query(
        `SELECT id, delivery_status, provider_reference, last_error, attempts
         FROM notifications WHERE id = $1`,
        [notificationId],
      );

      if (!existingRes.rowCount) return { success: false, error: "not_found" };
      const existing = existingRes.rows[0];

      if (existing.delivery_status === "accepted")
        return { success: true, accepted: true, delivered: false, sent: false, status: "accepted", providerReference: existing.provider_reference };
      if (existing.delivery_status === "delivered")
        return { success: true, delivered: true, sent: false, status: "delivered", providerReference: existing.provider_reference };
      if (existing.delivery_status === "sent")
        return { success: true, delivered: false, sent: true, status: "sent", providerReference: existing.provider_reference };
      if (existing.delivery_status === "suppressed")
        return { success: false, suppressed: true, error: existing.last_error ?? undefined };

      return {
        success: false,
        error: existing.last_error ?? (existing.delivery_status === "sending" ? "already_sending" : "already_processed"),
        status: existing.delivery_status,
        attempts: existing.attempts,
      };
    }

    const row = claimRes.rows[0];

    // ponytail: upgrade path: implement provider idempotency keys and automated worker reconciliation for in-flight 'sending' notifications.
    // If process dies after claim, leave 'sending' for manual reconciliation.

    // Enforce bounded purpose allowlist on dispatch
    if (!ALLOWED_NOTIFICATION_PURPOSES.includes(row.template)) {
      await client.query(
        `UPDATE notifications SET delivery_status='suppressed', last_error='disallowed_purpose', next_retry_at=NULL, updated_at=now() WHERE id=$1`,
        [notificationId],
      );
      await client.query(
        `INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, error_code)
         VALUES ($1, $2, 'suppressed', 'disallowed_purpose')
         ON CONFLICT (notification_id, attempt_number) DO NOTHING`,
        [notificationId, row.attempts + 1],
      );
      return { success: false, suppressed: true, error: "disallowed_purpose" };
    }

    if (!row.actor_account_id || typeof row.safe_reference !== "string" || !row.safe_reference.trim()) {
      await client.query(
        `UPDATE notifications SET delivery_status='suppressed', last_error='audit_context_required', next_retry_at=NULL, updated_at=now() WHERE id=$1`,
        [notificationId],
      );
      await client.query(
        `INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, error_code)
         VALUES ($1, $2, 'suppressed', 'audit_context_required')
         ON CONFLICT (notification_id, attempt_number) DO NOTHING`,
        [notificationId, row.attempts + 1],
      );
      return { success: false, suppressed: true, error: "audit_context_required" };
    }

    if (!row.sms_consent || !row.phone_number) {
      // Consent was revoked or not present
      await client.query(
        `UPDATE notifications SET delivery_status='suppressed', last_error='consent_revoked', next_retry_at=NULL, updated_at=now() WHERE id=$1`,
        [notificationId],
      );
      await client.query(
        `INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, error_code)
         VALUES ($1, $2, 'suppressed', 'consent_revoked')
         ON CONFLICT (notification_id, attempt_number) DO NOTHING`,
        [notificationId, row.attempts + 1],
      );
      return { success: false, suppressed: true, error: "consent_revoked" };
    }

    const nextAttempt = row.attempts + 1;
    if (nextAttempt > MAX_NOTIFICATION_ATTEMPTS) {
      await client.query(
        `UPDATE notifications SET delivery_status='failed', last_error='max_attempts_exceeded', next_retry_at=NULL, updated_at=now() WHERE id=$1`,
        [notificationId],
      );
      return { success: false, error: "max_attempts_exceeded", terminal: true, attempts: row.attempts };
    }

    const message =
      GENERIC_SMS_TEMPLATES[row.template] ??
      GENERIC_NOTIFICATION_TEMPLATES[row.template];
    if (!message) {
      await client.query(
        `UPDATE notifications SET delivery_status='suppressed', last_error='disallowed_purpose', next_retry_at=NULL, updated_at=now() WHERE id=$1`,
        [notificationId],
      );
      return { success: false, suppressed: true, error: "disallowed_purpose" };
    }

    const result = await sendSMS(row.phone_number, message);

    if (result.success) {
      const finalStatus = result.status;
      const outcome = await client.query(
        `WITH updated AS (
           UPDATE notifications
           SET delivery_status=$4, provider_reference=$2,
               delivered_at=CASE WHEN $4='delivered' THEN now() ELSE NULL END,
               last_error=NULL, next_retry_at=NULL, attempts=$3, updated_at=now()
           WHERE id=$1 AND delivery_status='sending'
           RETURNING actor_account_id, template
         ), attempt AS (
           INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, provider_reference)
           SELECT $1, $3, $4, $2 FROM updated
           RETURNING notification_id
         )
         INSERT INTO audit_events(actor_account_id, action, target_reference, source, request_reference, details)
         SELECT actor_account_id, 'notification.provider_result', $1, 'egov.emessage', $1,
                jsonb_strip_nulls(jsonb_build_object('feature', 'emessage', 'purpose', template,
                  'providerStatus', $4, 'providerCorrelationId', $2))
         FROM updated JOIN attempt ON attempt.notification_id=$1`,
        [notificationId, result.message_id ?? null, nextAttempt, finalStatus],
      );
      if (outcome.rowCount !== 1) throw new Error("notification outcome was not recorded");
      return {
        success: true,
        accepted: finalStatus === "accepted",
        delivered: finalStatus === "delivered",
        sent: finalStatus === "sent",
        status: finalStatus,
        providerReference: result.message_id,
      };
    } else {
      const redacted = redactErrorMessage(result.error);
      const isUnavailable =
        result.status === "unavailable" ||
        redacted === "network_error" ||
        redacted === "provider_unavailable" ||
        redacted === "delivery_unconfirmed";
      const status = isUnavailable ? "unavailable" : "failed";

      // Never auto-retry failed, unavailable, or ambiguous outcomes.
      const outcome = await client.query(
        `WITH updated AS (
           UPDATE notifications
           SET delivery_status=$4, last_error=$2, next_retry_at=NULL, attempts=$3, updated_at=now()
           WHERE id=$1 AND delivery_status='sending'
           RETURNING actor_account_id, template
         ), attempt AS (
           INSERT INTO notification_delivery_attempts(notification_id, attempt_number, status, error_code)
           SELECT $1, $3, $4, $2 FROM updated
           RETURNING notification_id
         )
         INSERT INTO audit_events(actor_account_id, action, target_reference, source, request_reference, details)
         SELECT actor_account_id, 'notification.provider_result', $1, 'egov.emessage', $1,
                jsonb_build_object('feature', 'emessage', 'purpose', template, 'providerStatus', $4)
         FROM updated JOIN attempt ON attempt.notification_id=$1`,
        [notificationId, redacted, nextAttempt, status],
      );
      if (outcome.rowCount !== 1) throw new Error("notification outcome was not recorded");
      return { success: false, error: redacted, status, attempts: nextAttempt };
    }
  } finally {
    if (ownClient && "release" in client) (client as PoolClient).release();
  }
}

export async function runNotificationBatch(
  options: { batchSize?: number; now?: Date } = {},
) {
  const pool = getPool();
  const limit = options.batchSize ?? 25;

  const pending = await pool.query(
    `SELECT id FROM notifications
     WHERE channel IN ('external_sms', 'emessage')
       AND delivery_status = 'pending'
     ORDER BY created_at ASC
     LIMIT $1`,
    [limit],
  );

  let delivered = 0;
  let sent = 0;
  let accepted = 0;
  let failed = 0;
  let suppressed = 0;
  let unavailable = 0;

  for (const row of pending.rows) {
    const res = await dispatchExternalNotification(row.id);
    if (res.delivered) delivered += 1;
    else if (res.sent) sent += 1;
    else if (res.accepted) accepted += 1;
    else if (res.suppressed) suppressed += 1;
    else if (res.status === "unavailable") unavailable += 1;
    else failed += 1;
  }

  return {
    leased: pending.rows.length,
    delivered,
    sent,
    accepted,
    failed,
    suppressed,
    unavailable,
  };
}
