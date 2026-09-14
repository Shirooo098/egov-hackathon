import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { requireSession, requireRole } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import type { RuntimeConfig } from '../runtime/config.js';
import { decryptProfile, type EncryptedProfileRecord } from '../crypto/profileCrypto.js';
import { maskPhoneNumber } from '../services/eMessageService.js';

const VALID_REQUEST_TYPES = new Set(['access', 'correction', 'restriction', 'objection', 'export']);

export function createPrivacyRouter(config: RuntimeConfig) {
  const router = express.Router();
  const db = () => getDb();
  const mode = config.mode;

  // POST /privacy/requests - Submit a new privacy request (access, correction, restriction, objection, export)
  router.post('/requests', requireSession, requireSameOrigin, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required' });
      if (account.role !== 'citizen') {
        return res.status(403).json({ success: false, error: 'forbidden', message: 'Privacy requests reserved for citizens' });
      }

      const { requestType, details = {}, idempotencyKey } = req.body || {};
      if (!requestType || !VALID_REQUEST_TYPES.has(requestType)) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid requestType (must be access, correction, restriction, objection, or export)' });
      }
      if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0 || idempotencyKey.length > 200) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'idempotencyKey is required' });
      }

      // Check existing request by idempotency key
      const existing = await db().execute(sql`
        SELECT id, request_type AS "requestType", status, details, created_at AS "createdAt"
        FROM privacy_requests
        WHERE account_id = ${account.id} AND idempotency_key = ${idempotencyKey.trim()}
      `);

      if (existing.rowCount) {
        return res.status(200).json({ success: true, data: { ...(existing.rows[0] as any), idempotent: true }, idempotent: true });
      }

      const inserted = await db().execute(sql`
        INSERT INTO privacy_requests(account_id, request_type, status, details, idempotency_key)
        VALUES (${account.id}, ${requestType}, 'submitted', ${JSON.stringify(details)}, ${idempotencyKey.trim()})
        RETURNING id, request_type AS "requestType", status, details, created_at AS "createdAt"
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, idempotency_reference, details)
        VALUES (${account.id}, 'privacy_request_submitted', ${account.id}, 'privacy', ${idempotencyKey.trim()},
                ${JSON.stringify({ requestType, requestId: (inserted.rows[0] as any).id })})
      `);

      return res.status(201).json({ success: true, data: inserted.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // GET /privacy/requests - List citizen's privacy requests
  router.get('/requests', requireSession, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required' });

      const result = await db().execute(sql`
        SELECT id, request_type AS "requestType", status, details, rejection_reason AS "rejectionReason",
               fulfilled_at AS "fulfilledAt", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM privacy_requests
        WHERE account_id = ${account.id}
        ORDER BY created_at DESC
      `);

      return res.json({ success: true, data: { items: result.rows } });
    } catch (err) {
      return next(err);
    }
  });

  // GET /privacy/requests/:id - View single privacy request
  router.get('/requests/:id', requireSession, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required' });

      const result = await db().execute(sql`
        SELECT id, request_type AS "requestType", status, details, rejection_reason AS "rejectionReason",
               fulfilled_at AS "fulfilledAt", created_at AS "createdAt", updated_at AS "updatedAt"
        FROM privacy_requests
        WHERE id = ${req.params.id} AND account_id = ${account.id}
      `);

      if (!result.rowCount) return res.status(404).json({ success: false, error: 'not_found', message: 'Privacy request not found' });
      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  });

  // GET /privacy/export - Scoped, authenticated citizen personal data export (Zero disclosure of counterpart)
  router.get('/export', requireSession, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = req.account;
      if (!account) return res.status(401).json({ success: false, error: 'unauthorized', message: 'Authentication required' });
      if (account.role !== 'citizen') {
        return res.status(403).json({ success: false, error: 'forbidden', message: 'Data export reserved for citizens' });
      }

      // 1. Account info
      const accountRow = (await db().execute(sql`
        SELECT id, login_identity AS "loginIdentity", display_name AS "displayName", role, status, created_at AS "createdAt"
        FROM accounts WHERE id = ${account.id}
      `)).rows[0];

      // 2. Profile info (decrypted for owner only)
      const profileResult = await db().execute(sql`
        SELECT id, encrypted_payload AS "encryptedPayload", iv, auth_tag AS "authTag", key_id AS "keyId", environment_mode AS "environmentMode", version, updated_at AS "updatedAt"
        FROM citizen_profiles WHERE account_id = ${account.id}
      `);

      let decryptedProfile = null;
      if (profileResult.rowCount) {
        const rawProfile = profileResult.rows[0] as unknown as EncryptedProfileRecord & { id: string; version: number; updatedAt: Date };
        try {
          const profileData = decryptProfile(rawProfile, mode);
          decryptedProfile = {
            id: rawProfile.id,
            ...profileData,
            version: rawProfile.version,
            updatedAt: rawProfile.updatedAt,
          };
        } catch {
          decryptedProfile = { status: 'decryption_unavailable' };
        }
      }

      // 3. Notification preferences
      const prefResult = await db().execute(sql`
        SELECT sms_consent AS "smsConsent", phone_number AS "phoneNumber", updated_at AS "updatedAt"
        FROM notification_preferences WHERE account_id = ${account.id}
      `);
      const prefRow = prefResult.rowCount
        ? {
            smsConsent: Boolean((prefResult.rows[0] as any).smsConsent),
            phoneNumberMasked: maskPhoneNumber((prefResult.rows[0] as any).phoneNumber),
          }
        : { smsConsent: false, phoneNumberMasked: null };

      // 4. Cases & Episodes (Requester only)
      const casesResult = await db().execute(sql`
        SELECT c.id, c.role, c.status, c.created_at AS "createdAt",
               e.id AS "episodeId", e.lifecycle, e.participation, e.version AS "episodeVersion",
               e.pause_reason AS "pauseReason", e.withdrawal_reason AS "withdrawalReason"
        FROM citizen_cases c
        LEFT JOIN episodes e ON e.case_id = c.id
        WHERE c.account_id = ${account.id}
        ORDER BY c.created_at ASC
      `);

      // 5. Intakes
      const intakesResult = await db().execute(sql`
        SELECT ri.episode_id AS "episodeId", 'recipient' AS "intakeType", ri.declared_blood_group AS "declaredBloodGroup", ri.urgency, ri.state, ri.version
        FROM recipient_intakes ri
        JOIN episodes e ON e.id = ri.episode_id
        JOIN citizen_cases c ON c.id = e.case_id
        WHERE c.account_id = ${account.id}
        UNION ALL
        SELECT di.episode_id AS "episodeId", 'donor' AS "intakeType", di.declared_blood_group AS "declaredBloodGroup", di.availability AS "urgency", di.state, di.version
        FROM donor_intakes di
        JOIN episodes e ON e.id = di.episode_id
        JOIN citizen_cases c ON c.id = e.case_id
        WHERE c.account_id = ${account.id}
      `);

      // 6. Appointments & Bookings (Requester only)
      const appointmentsResult = await db().execute(sql`
        SELECT ar.id, ar.slot_reference AS "slotReference", ar.preferred_dates AS "preferredDates", ar.status, ar.created_at AS "createdAt"
        FROM appointment_requests ar
        WHERE ar.actor_account_id = ${account.id}
      `);

      const bookingsResult = await db().execute(sql`
        SELECT b.id, b.slot_reference AS "slotReference", b.status, b.hospital_booking_reference AS "hospitalBookingReference", b.confirmed_at AS "confirmedAt", b.created_at AS "createdAt"
        FROM bookings b
        JOIN appointment_requests ar ON ar.id = b.request_id
        JOIN episodes e ON e.id = ar.episode_id
        JOIN citizen_cases c ON c.id = e.case_id
        WHERE c.account_id = ${account.id}
      `);

      // 7. Consents granted by this citizen
      const consentsResult = await db().execute(sql`
        SELECT ec.id, ec.consent_version AS "consentVersion", ec.action, ec.created_at AS "createdAt"
        FROM episode_consents ec
        JOIN episodes e ON e.id = ec.episode_id
        JOIN citizen_cases c ON c.id = e.case_id
        WHERE c.account_id = ${account.id}
        UNION ALL
        SELECT pc.id, pc.consent_version AS "consentVersion", pc.action, pc.created_at AS "createdAt"
        FROM pair_consents pc
        WHERE pc.actor_account_id = ${account.id}
      `);

      // 8. Notifications
      const notifsResult = await db().execute(sql`
        SELECT id, template, channel, delivery_status AS "deliveryStatus", read_at AS "readAt", created_at AS "createdAt"
        FROM notifications WHERE recipient_account_id = ${account.id}
      `);

      // 9. Privacy requests & Corrections
      const privReqsResult = await db().execute(sql`
        SELECT id, request_type AS "requestType", status, created_at AS "createdAt"
        FROM privacy_requests WHERE account_id = ${account.id}
      `);

      const correctionsResult = await db().execute(sql`
        SELECT id, target_record_type AS "targetRecordType", field_name AS "fieldName", version, applied_at AS "appliedAt"
        FROM privacy_correction_history WHERE account_id = ${account.id}
      `);

      // Audit export access
      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${account.id}, 'privacy_export_generated', ${account.id}, 'privacy',
                ${JSON.stringify({ timestamp: new Date().toISOString() })})
      `);

      return res.json({
        success: true,
        data: {
          exportDate: new Date().toISOString(),
          requesterAccountId: account.id,
          exportData: {
            account: accountRow,
            profile: decryptedProfile,
            notificationPreferences: prefRow,
            cases: casesResult.rows,
            intakes: intakesResult.rows,
            appointments: appointmentsResult.rows,
            bookings: bookingsResult.rows,
            consents: consentsResult.rows,
            notifications: notifsResult.rows,
            privacyRequests: privReqsResult.rows,
            correctionHistory: correctionsResult.rows,
          },
        },
      });
    } catch (err) {
      return next(err);
    }
  });

  // Admin routes for privacy review and fulfillment
  // GET /privacy/admin/requests - Operator/admin view of pending privacy requests
  router.get('/admin/requests', requireSession, requireRole('hospital_admin', 'clinical_lead', 'coordinator'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await db().execute(sql`
        SELECT pr.id, pr.account_id AS "accountId", pr.request_type AS "requestType", pr.status, pr.details,
               pr.rejection_reason AS "rejectionReason", pr.fulfilled_at AS "fulfilledAt", pr.created_at AS "createdAt"
        FROM privacy_requests pr
        ORDER BY pr.created_at ASC
      `);
      return res.json({ success: true, data: { items: result.rows } });
    } catch (err) {
      return next(err);
    }
  });

  // POST /privacy/admin/requests/:id/fulfill - Fulfill privacy request and apply correction if needed
  router.post('/admin/requests/:id/fulfill', requireSession, requireSameOrigin, requireRole('hospital_admin', 'clinical_lead'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const operator = req.account!;
      const reqId = req.params.id;
      const { correctionDetails } = req.body || {};

      const reqRow = (await db().execute(sql`
        SELECT id, account_id AS "accountId", request_type AS "requestType", status, details
        FROM privacy_requests WHERE id = ${reqId}
      `)).rows[0] as { id: string; accountId: string; requestType: string; status: string; details: any };

      if (!reqRow) return res.status(404).json({ success: false, error: 'not_found', message: 'Privacy request not found' });
      if (reqRow.status === 'fulfilled') return res.status(409).json({ success: false, error: 'conflict', message: 'Request is already fulfilled' });

      // If this is a correction request and correction details are provided, apply and record history
      if (reqRow.requestType === 'correction' && correctionDetails) {
        const { targetRecordType, targetRecordId, fieldName, previousValue, newValue, version = 1 } = correctionDetails;
        if (!targetRecordType || !fieldName || newValue === undefined) {
          return res.status(422).json({ success: false, error: 'validation_error', message: 'targetRecordType, fieldName, and newValue are required for correction' });
        }

        await db().execute(sql`
          INSERT INTO privacy_correction_history(request_id, account_id, target_record_type, target_record_id, field_name, previous_value, new_value, version, applied_by)
          VALUES (${reqId}, ${reqRow.accountId}, ${targetRecordType}, ${targetRecordId ?? null}, ${fieldName}, ${previousValue ?? null}, ${String(newValue)}, ${version}, ${operator.id})
        `);
      }

      await db().execute(sql`
        UPDATE privacy_requests
        SET status = 'fulfilled', fulfilled_at = now(), fulfilled_by = ${operator.id}, updated_at = now()
        WHERE id = ${reqId}
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${operator.id}, 'privacy_request_fulfilled', ${reqRow.accountId}, 'privacy',
                ${JSON.stringify({ requestId: reqId, requestType: reqRow.requestType })})
      `);

      return res.json({ success: true, data: { id: reqId, status: 'fulfilled' } });
    } catch (err) {
      return next(err);
    }
  });

  // POST /privacy/admin/requests/:id/reject - Reject privacy request with attributable reason
  router.post('/admin/requests/:id/reject', requireSession, requireSameOrigin, requireRole('hospital_admin', 'clinical_lead'), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const operator = req.account!;
      const reqId = req.params.id;
      const { rejectionReason } = req.body || {};

      if (!rejectionReason || typeof rejectionReason !== 'string' || rejectionReason.trim().length === 0) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'rejectionReason is required' });
      }

      const reqRow = (await db().execute(sql`
        SELECT id, account_id AS "accountId", request_type AS "requestType", status
        FROM privacy_requests WHERE id = ${reqId}
      `)).rows[0] as { id: string; accountId: string; requestType: string; status: string };

      if (!reqRow) return res.status(404).json({ success: false, error: 'not_found', message: 'Privacy request not found' });
      if (reqRow.status === 'fulfilled' || reqRow.status === 'rejected') {
        return res.status(409).json({ success: false, error: 'conflict', message: 'Request has already been processed' });
      }

      await db().execute(sql`
        UPDATE privacy_requests
        SET status = 'rejected', rejection_reason = ${rejectionReason.trim()}, updated_at = now()
        WHERE id = ${reqId}
      `);

      await db().execute(sql`
        INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${operator.id}, 'privacy_request_rejected', ${reqRow.accountId}, 'privacy',
                ${JSON.stringify({ requestId: reqId, rejectionReason: rejectionReason.trim() })})
      `);

      return res.json({ success: true, data: { id: reqId, status: 'rejected', rejectionReason: rejectionReason.trim() } });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

export default createPrivacyRouter;
