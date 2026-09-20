import crypto from 'node:crypto';
import express from 'express';
import { getPool } from '../db/pool.js';
import { requireRole, requireSession } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import { UUID, type Json } from '../services/syntheticHospitalEvents.js';
import { runSyntheticScenario } from './hospital-events.js';
import type { RuntimeConfig } from '../runtime/config.js';

const ACTIONS: Record<string, string> = {
  'appointment-decline': 'appointment.request-status',
  'appointment-reject': 'appointment.request-status',
  'appointment-confirm': 'appointment.request-status',
  'appointment-accept': 'appointment.request-status',
  'appointment-confirmed': 'booking.confirmed',
  'blood-close': 'blood.request-closed',
  'deceased-offer-receive': 'deceased-offer.received',
  'deceased-offer-received': 'deceased-offer.received',
  'deceased-offer-acknowledge': 'deceased-offer.acknowledged',
  'deceased-offer-acknowledged': 'deceased-offer.acknowledged',
  'deceased-offer-respond': 'deceased-offer.responded',
  'deceased-offer-response': 'deceased-offer.responded',
};
const STAFF_READ = [requireSession, requireRole('hospital_admin', 'supervisor', 'coordinator', 'clinical_lead', 'doctor', 'scheduler', 'blood_approver')];

function scenarioPayload(action: string, body: Record<string, unknown>, key: string): Record<string, Json> | null {
  const reference = `scenario-${crypto.createHash('sha256').update(key).digest('hex').slice(0, 32)}`;
  if (['appointment-decline', 'appointment-reject', 'appointment-confirm', 'appointment-accept'].includes(action)) {
    return { status: action.includes('decline') || action.includes('reject') ? 'declined' : 'accepted', hospitalReference: reference };
  }
  if (action === 'appointment-confirmed') return typeof body.slotReference === 'string' ? { slotReference: body.slotReference, hospitalBookingReference: reference } : null;
  if (action === 'blood-close') return { hospitalReference: reference };
  if (['deceased-offer-receive', 'deceased-offer-received'].includes(action)) return { offerReference: reference, ...(body.deadline === undefined ? {} : { deadline: String(body.deadline) }) };
  if (['deceased-offer-acknowledge', 'deceased-offer-acknowledged'].includes(action)) return { acknowledgementReference: reference };
  if (['deceased-offer-respond', 'deceased-offer-response'].includes(action)) return ['accepted', 'declined'].includes(String(body.responseStatus)) ? { responseReference: reference, responseStatus: String(body.responseStatus) } : null;
  return null;
}

async function targetInScope(eventType: string, target: string, hospitalId: string, serviceScope: string[]): Promise<boolean> {
  const pool = getPool();
  if (eventType === 'blood.request-closed') {
    return Boolean((await pool.query(`SELECT 1 FROM blood_requests WHERE id=$1 AND hospital_id=$2 AND 'blood'=ANY($3::text[])`, [target, hospitalId, serviceScope])).rowCount);
  }
  if (eventType === 'deceased-offer.received') {
    return Boolean((await pool.query(`SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
      WHERE e.id=$1 AND c.hospital_id=$2 AND s.code=ANY($3::text[]) AND s.code='kidney'`, [target, hospitalId, serviceScope])).rowCount);
  }
  if (eventType.startsWith('deceased-offer.')) {
    return Boolean((await pool.query(`SELECT 1 FROM deceased_offers o JOIN episodes e ON e.id=o.recipient_episode_id
      JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
      WHERE o.id=$1 AND c.hospital_id=$2 AND s.code=ANY($3::text[])`, [target, hospitalId, serviceScope])).rowCount);
  }
  return Boolean((await pool.query(`SELECT 1 FROM appointment_requests r JOIN episodes e ON e.id=r.episode_id
    JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
    WHERE r.id=$1 AND c.hospital_id=$2 AND s.code=ANY($3::text[])`, [target, hospitalId, serviceScope])).rowCount);
}

export function createSyntheticHospitalRouter(config: RuntimeConfig) {
  const router = express.Router();
  router.post('/synthetic-hospital/scenarios/:action', requireSession, requireRole('hospital_admin', 'supervisor'), requireSameOrigin, async (req, res, next) => {
    try {
      if (config.mode !== 'synthetic') return res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' });
      const action = String(req.params.action);
      const eventType = ACTIONS[action];
      const body = (req.body ?? {}) as Record<string, unknown>;
      const target = typeof body.targetReference === 'string' ? body.targetReference : body.targetId;
      const targetCount = [body.targetReference, body.targetId].filter((value) => typeof value === 'string').length;
      const key = typeof body.idempotencyKey === 'string' ? body.idempotencyKey.trim() : '';
      const account = req.account!;
      const allowed = new Set(['targetReference', 'targetId', 'idempotencyKey', ...(action === 'appointment-confirmed' ? ['slotReference'] : []), ...(['deceased-offer-receive', 'deceased-offer-received'].includes(action) ? ['deadline'] : []), ...(['deceased-offer-respond', 'deceased-offer-response'].includes(action) ? ['responseStatus'] : [])]);
      const payload = scenarioPayload(action, body, key);
      if (!eventType || targetCount !== 1 || typeof target !== 'string' || !UUID.test(target) || !key || key.length > 200 || !account.hospitalId || !payload || Object.keys(body).some((field) => !allowed.has(field))) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'Scenario action is invalid' });
      }
      if (!await targetInScope(eventType, target, account.hospitalId, account.serviceScope ?? [])) {
        return res.status(403).json({ success: false, error: 'forbidden', message: 'Target is outside hospital or service scope' });
      }
      const result = await runSyntheticScenario({ hospitalId: account.hospitalId, eventType, targetReference: target, payload, idempotencyKey: key }, config, { pool: getPool() });
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  });

  router.get('/hospital/deceased-offers', ...STAFF_READ, async (req, res, next) => {
    try {
      const account = req.account!;
      const result = await getPool().query(`SELECT o.id,o.external_reference AS "externalReference",ri.requested_organ AS organ,
        o.source_deadline AS "sourceDeadline",o.status,o.acknowledgement_reference AS "acknowledgementReference",
        o.response_reference AS "responseReference",o.response_status AS "responseStatus",
        cr.id AS "reviewId",cr.approved_summary AS "approvedSummary",reviewer.id AS "assignedReviewerId",reviewer.display_name AS "assignedReviewerName"
        FROM deceased_offers o
        JOIN episodes e ON e.id=o.recipient_episode_id
        JOIN recipient_intakes ri ON ri.episode_id=e.id
        JOIN citizen_cases c ON c.id=e.case_id
        JOIN services s ON s.id=c.service_id
        LEFT JOIN LATERAL (SELECT id,approved_summary FROM clinical_reviews WHERE offer_id=o.id ORDER BY occurred_at DESC LIMIT 1) cr ON true
        LEFT JOIN staff_assignments sa ON sa.review_id=cr.id
        LEFT JOIN accounts reviewer ON reviewer.id=sa.primary_staff_id
        WHERE c.hospital_id=$1 AND c.status='active' AND e.participation='active' AND o.status <> 'retired'
          AND s.code=ANY($2::text[]) AND ($3 <> 'doctor' OR reviewer.id=$4)
        ORDER BY o.created_at DESC`, [account.hospitalId, account.serviceScope ?? [], account.role, account.id]);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/hospital/reviewers', ...STAFF_READ, async (req, res, next) => {
    try {
      const account = req.account!;
      const serviceId = String(req.query.serviceId ?? '');
      if (!UUID.test(serviceId)) return res.status(422).json({ success: false, error: 'validation_error', message: 'serviceId is required' });
      const result = await getPool().query(`SELECT DISTINCT a.id,a.display_name AS "displayName",a.role
        FROM accounts a
        JOIN pair_reviewer_grants g ON g.account_id=a.id
        JOIN services s ON s.id=$2
        WHERE a.hospital_id=$1 AND a.status='active' AND g.service_id=$2 AND g.revoked_at IS NULL
          AND s.hospital_id=a.hospital_id AND s.code=ANY(a.service_scope::text[]) AND s.code=ANY($3::text[])
          AND a.role IN ('doctor','clinical_lead')
        ORDER BY a.display_name`, [account.hospitalId, serviceId, account.serviceScope ?? []]);
      return res.json({ success: true, data: { items: result.rows } });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/episodes/:id/deceased-offers', requireSession, async (req, res, next) => {
    try {
      const result = await getPool().query(`SELECT o.id,o.external_reference AS "externalReference",o.status,
        o.source_deadline AS deadline,o.acknowledgement_reference IS NOT NULL AS acknowledged,o.response_status AS "responseStatus"
        FROM deceased_offers o
        JOIN episodes e ON e.id=o.recipient_episode_id
        JOIN citizen_cases c ON c.id=e.case_id
        WHERE e.id=$1 AND c.account_id=$2 ORDER BY o.created_at DESC`, [req.params.id, req.account!.id]);
      return res.json({ success: true, data: result.rows });
    } catch (error) {
      return next(error);
    }
  });
  return router;
}
