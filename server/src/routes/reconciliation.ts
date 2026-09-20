import crypto from 'node:crypto';
import express from 'express';
import { getPool } from '../db/pool.js';
import { requireRole, requireSession } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import type { RuntimeConfig } from '../runtime/config.js';
import { applyAppointmentEvent, type AppointmentEventInput } from './hospital-events.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const ROLES = ['coordinator', 'clinical_lead', 'hospital_admin', 'scheduler', 'supervisor'];
const CAUSES = "('hospital_event_conflict','appointment_outbox_dead_letter')";
const fail = (res: express.Response, status: number, error: string, message: string) => res.status(status).json({ success: false, error, message });
const exact = (value: unknown, keys: string[]) => Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).every((key) => keys.includes(key)));
export const validObservedAt = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value && parsed.getTime() <= Date.now() + 5 * 60_000;
};
const sameHash = (value: unknown, expected: Buffer) => Buffer.isBuffer(value) && value.length === expected.length && crypto.timingSafeEqual(value, expected);

export function createReconciliationRouter(config: RuntimeConfig) {
  const router = express.Router();
  router.use(requireSession);

  router.get('/', async (req, res, next) => {
    try {
      const actor = req.account!;
      if (!ROLES.includes(actor.role) || !actor.hospitalId) return fail(res, 403, 'forbidden', 'Insufficient reconciliation scope');
      const result = await getPool().query(`SELECT f.id,f.episode_id AS "episodeId",f.booking_id AS "bookingId",f.outbox_id AS "outboxId",f.conflict_reference AS "conflictReference",f.cause,f.status,f.version,f.originating_event_id AS "originatingEventId",f.created_at AS "createdAt",f.updated_at AS "updatedAt"
        FROM follow_up_tasks f LEFT JOIN episodes e ON e.id=f.episode_id LEFT JOIN citizen_cases c ON c.id=e.case_id LEFT JOIN services s ON s.id=c.service_id LEFT JOIN hospital_source_events hse ON hse.id=f.originating_event_id
        WHERE f.cause IN ${CAUSES} AND ((c.hospital_id=$1 AND s.code=ANY($2::text[]) AND (hse.id IS NULL OR hse.hospital_id=c.hospital_id)) OR (f.episode_id IS NULL AND hse.hospital_id=$1 AND $3 IN ('hospital_admin','supervisor')))
        ORDER BY f.created_at DESC`, [actor.hospitalId, actor.serviceScope ?? [], actor.role]);
      return res.json({ success: true, data: result.rows });
    } catch (error) { return next(error); }
  });

  router.post('/:id/resolve', requireSameOrigin, requireRole(...ROLES), async (req, res, next) => {
    const id = String(req.params.id);
    const body = req.body ?? {};
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const evidence = body.evidenceReference == null ? null : body.evidenceReference;
    if (!UUID.test(id) || !exact(body, ['reason', 'expectedVersion', 'evidenceReference']) || !reason || reason.length > 1000 || !Number.isInteger(body.expectedVersion) || (evidence !== null && (typeof evidence !== 'string' || !REF.test(evidence)))) return fail(res, 422, 'validation_error', 'Valid reason, version, and evidence reference are required');
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const task = await client.query(`SELECT f.* FROM follow_up_tasks f LEFT JOIN episodes e ON e.id=f.episode_id LEFT JOIN citizen_cases c ON c.id=e.case_id LEFT JOIN services s ON s.id=c.service_id LEFT JOIN hospital_source_events hse ON hse.id=f.originating_event_id
        WHERE f.id=$1 AND f.cause IN ${CAUSES} AND ((c.hospital_id=$2 AND s.code=ANY($3::text[]) AND (hse.id IS NULL OR hse.hospital_id=c.hospital_id)) OR (f.episode_id IS NULL AND hse.hospital_id=$2 AND $4 IN ('hospital_admin','supervisor'))) FOR UPDATE OF f`, [id, req.account!.hospitalId, req.account!.serviceScope ?? [], req.account!.role]);
      if (!task.rowCount) { await client.query('ROLLBACK'); return fail(res, 404, 'not_found', 'Reconciliation task not found'); }
      const row = task.rows[0];
      if (row.status !== 'pending' || Number(row.version) !== body.expectedVersion) { await client.query('ROLLBACK'); return fail(res, 409, 'version_conflict', 'Reconciliation task changed'); }
      await client.query(`UPDATE follow_up_tasks SET status='resolved',version=version+1,updated_at=now() WHERE id=$1`, [id]);
      const history = await client.query(`INSERT INTO reconciliation_events(target_reference,conflicting_references,resolver_id,decision,authoritative_evidence,resolved_at,reason,source_event_id,follow_up_task_id) VALUES($1,$2,$3,'resolved',$4,now(),$5,$6,$7) RETURNING id`, [row.conflict_reference ?? id, JSON.stringify([row.conflict_reference ?? id]), req.account!.id, evidence, reason, row.originating_event_id, id]);
      await client.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES($1,'reconciliation_resolved',$2,'api',$3)`, [req.account!.id, id, JSON.stringify({ reconciliationEventId: history.rows[0].id })]);
      await client.query('COMMIT');
      return res.json({ success: true, data: { id, status: 'resolved', version: body.expectedVersion + 1 } });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); return next(error); } finally { client.release(); }
  });

  router.post('/:id/requeue', requireSameOrigin, requireRole(...ROLES), async (req, res, next) => {
    const id = String(req.params.id);
    const body = req.body ?? {};
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!UUID.test(id) || !exact(body, ['reason', 'expectedVersion']) || !reason || reason.length > 1000 || !Number.isInteger(body.expectedVersion)) return fail(res, 422, 'validation_error', 'Reason and expectedVersion are required');
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const task = await client.query(`SELECT f.*,hse.event_type,hse.target_reference,hse.payload,hse.observed_at,hse.author_reference,hse.source_namespace,hse.source_event_id,hse.hospital_id AS event_hospital_id
        FROM follow_up_tasks f LEFT JOIN episodes e ON e.id=f.episode_id LEFT JOIN citizen_cases c ON c.id=e.case_id LEFT JOIN services s ON s.id=c.service_id LEFT JOIN hospital_source_events hse ON hse.id=f.originating_event_id
        WHERE f.id=$1 AND f.cause IN ${CAUSES} AND ((c.hospital_id=$2 AND s.code=ANY($3::text[]) AND (hse.id IS NULL OR hse.hospital_id=c.hospital_id)) OR (f.episode_id IS NULL AND hse.hospital_id=$2 AND $4 IN ('hospital_admin','supervisor'))) FOR UPDATE OF f`, [id, req.account!.hospitalId, req.account!.serviceScope ?? [], req.account!.role]);
      if (!task.rowCount) { await client.query('ROLLBACK'); return fail(res, 404, 'not_found', 'Reconciliation task not found'); }
      const row = task.rows[0];
      if (!['pending', 'dead_letter', 'resolved'].includes(row.status) || Number(row.version) !== body.expectedVersion) { await client.query('ROLLBACK'); return fail(res, 409, 'version_conflict', 'Reconciliation task changed'); }
      let processingResult: 'queued' | 'applied' | 'conflict';
      let status: 'pending' | 'resolved' = 'pending';
      if (row.outbox_id) {
        const queued = await client.query(`UPDATE appointment_outbox SET status='failed',available_at=now(),last_error_code=NULL,updated_at=now() WHERE id=$1 AND status='dead_letter' RETURNING id`, [row.outbox_id]);
        if (!queued.rowCount) { await client.query('ROLLBACK'); return fail(res, 409, 'conflict', 'Outbox item cannot be requeued'); }
        processingResult = 'queued';
      } else if (row.originating_event_id) {
        const event: AppointmentEventInput = { eventType: row.event_type, targetReference: row.target_reference, payload: row.payload, observedAt: new Date(row.observed_at).toISOString(), eventReference: row.source_event_id };
        processingResult = await applyAppointmentEvent(client, row.originating_event_id, event, row.author_reference, row.event_hospital_id, row.source_namespace === 'manual-hospital-update' ? 'manual-hospital-update' : 'signed-hospital-event');
        status = processingResult === 'applied' ? 'resolved' : 'pending';
        await client.query(`UPDATE hospital_source_events SET processing_result=$1 WHERE id=$2`, [processingResult, row.originating_event_id]);
      } else {
        await client.query('ROLLBACK'); return fail(res, 409, 'conflict', 'Task has no retryable evidence');
      }
      await client.query(`UPDATE follow_up_tasks SET status=$1,version=version+1,updated_at=now() WHERE id=$2`, [status, id]);
      const history = await client.query(`INSERT INTO reconciliation_events(target_reference,conflicting_references,resolver_id,decision,resolved_at,reason,source_event_id,follow_up_task_id) VALUES($1,$2,$3,$4,now(),$5,$6,$7) RETURNING id`, [row.conflict_reference ?? id, JSON.stringify([row.conflict_reference ?? id]), req.account!.id, `requeue_${processingResult}`, reason, row.originating_event_id, id]);
      await client.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES($1,'reconciliation_requeued',$2,'api',$3)`, [req.account!.id, id, JSON.stringify({ reconciliationEventId: history.rows[0].id, processingResult })]);
      await client.query('COMMIT');
      return res.json({ success: true, data: { id, status, processingResult, version: body.expectedVersion + 1 } });
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); return next(error); } finally { client.release(); }
  });

  router.post('/manual-hospital-update', requireSameOrigin, requireRole(...ROLES), async (req, res, next) => {
    if (config.mode !== 'synthetic') return fail(res, 404, 'not_found', 'Route not found');
    const body = req.body ?? {};
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!exact(body, ['targetReference', 'source', 'sourceReference', 'reason', 'observedAt', 'payload']) || !UUID.test(String(body.targetReference)) || !REF.test(String(body.source ?? '')) || !REF.test(String(body.sourceReference ?? '')) || !reason || reason.length > 1000 || !validObservedAt(body.observedAt) || !exact(body.payload, ['slotReference', 'hospitalBookingReference']) || !REF.test(String(body.payload?.slotReference ?? '')) || !REF.test(String(body.payload?.hospitalBookingReference ?? ''))) return fail(res, 422, 'validation_error', 'Invalid manual Hospital update');
    const payload = body.payload as Record<string, string>;
    const payloadText = JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadText).digest();
    const requestHash = crypto.createHash('sha256').update(JSON.stringify({ targetReference: body.targetReference, source: body.source, sourceReference: body.sourceReference, reason, observedAt: body.observedAt, payload })).digest();
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text,0))`, [req.account!.hospitalId, body.sourceReference]);
      const prior = await client.query(`SELECT id,target_reference,envelope_hash,author_reference,processing_result FROM hospital_source_events WHERE source_namespace='manual-hospital-update' AND hospital_id=$1 AND source_event_id=$2 FOR UPDATE`, [req.account!.hospitalId, body.sourceReference]);
      if (prior.rowCount) {
        const row = prior.rows[0];
        const replay = row.target_reference === body.targetReference && row.author_reference === req.account!.id && sameHash(row.envelope_hash, requestHash);
        await client.query(replay ? 'COMMIT' : 'ROLLBACK');
        if (!replay) return fail(res, 409, 'event_conflict', 'Manual source reference already exists');
        if (row.processing_result !== 'applied') return res.status(409).json({ success: false, error: 'conflict', message: 'Manual update was preserved for reconciliation', data: { sourceReference: body.sourceReference, processingResult: row.processing_result, replay: true, manual: true } });
        return res.json({ success: true, data: { sourceReference: body.sourceReference, processingResult: row.processing_result, replay: true, manual: true } });
      }
      const inserted = await client.query(`INSERT INTO hospital_source_events(source_namespace,hospital_id,source_event_id,event_type,target_reference,payload_hash,payload,occurred_at,processing_result,author_reference,observed_at,envelope_hash)
        SELECT 'manual-hospital-update',$1,$2,'booking.confirmed',$3,$4,$5::jsonb,$6,'manual_pending',$7,$6,$8
        FROM appointment_requests r JOIN episodes e ON e.id=r.episode_id JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
        WHERE r.id=$3 AND c.hospital_id=$1 AND c.status='active' AND e.lifecycle='active' AND e.participation='active' AND s.code=ANY($9::text[]) AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.episode_id=e.id OR hl.case_id=c.id) AND hl.state='suspended') RETURNING id`, [req.account!.hospitalId, body.sourceReference, body.targetReference, payloadHash, payloadText, body.observedAt, req.account!.id, requestHash, req.account!.serviceScope ?? []]);
      if (!inserted.rowCount) { await client.query('ROLLBACK'); return fail(res, 404, 'not_found', 'Appointment not found in scope'); }
      const event: AppointmentEventInput = { eventType: 'booking.confirmed', targetReference: body.targetReference, payload, observedAt: body.observedAt, eventReference: body.sourceReference };
      const processingResult = await applyAppointmentEvent(client, inserted.rows[0].id, event, req.account!.id, req.account!.hospitalId!, 'manual-hospital-update');
      await client.query(`UPDATE hospital_source_events SET processing_result=$1 WHERE id=$2`, [processingResult, inserted.rows[0].id]);
      let taskId: string | null = null;
      if (processingResult === 'conflict') {
        const task = await client.query(`INSERT INTO follow_up_tasks(episode_id,conflict_reference,assigned_team,cause,status,originating_event_id) SELECT (SELECT episode_id FROM appointment_requests WHERE id=$1),$2,'coordination','hospital_event_conflict','pending',$3 ON CONFLICT (originating_event_id) WHERE originating_event_id IS NOT NULL DO NOTHING RETURNING id`, [body.targetReference, body.sourceReference, inserted.rows[0].id]);
        taskId = task.rows[0]?.id ?? null;
      }
      const history = await client.query(`INSERT INTO reconciliation_events(target_reference,conflicting_references,resolver_id,decision,authoritative_evidence,resolved_at,reason,source_event_id,follow_up_task_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [body.targetReference, JSON.stringify([body.sourceReference]), req.account!.id, `manual_${processingResult}`, body.sourceReference, body.observedAt, reason, inserted.rows[0].id, taskId]);
      await client.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES($1,$2,$3,$4,$5)`, [req.account!.id, `manual_hospital_${processingResult}`, body.targetReference, body.source, JSON.stringify({ reconciliationEventId: history.rows[0].id, sourceReference: body.sourceReference, processingResult })]);
      await client.query('COMMIT');
      if (processingResult !== 'applied') return fail(res, 409, 'conflict', 'Manual update was preserved for reconciliation');
      return res.status(201).json({ success: true, data: { sourceReference: body.sourceReference, processingResult, replay: false, manual: true } });
    } catch (error: unknown) {
      await client.query('ROLLBACK').catch(() => {});
      if (error instanceof Error && 'code' in error && error.code === '23505') return fail(res, 409, 'event_conflict', 'Manual source reference already exists');
      return next(error);
    } finally { client.release(); }
  });

  return router;
}
