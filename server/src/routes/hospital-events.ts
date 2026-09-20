import crypto from 'node:crypto';
import express from 'express';
import type { PoolClient } from 'pg';
import { getPool } from '../db/pool.js';
import type { RuntimeConfig } from '../runtime/config.js';
import {
  SCHEMA_VERSION,
  UUID,
  canonicalJson,
  signSyntheticEnvelope,
  verifySyntheticEnvelope,
  type Envelope,
  type Json,
  type SyntheticEnvelopeInput,
} from '../services/syntheticHospitalEvents.js';

export { SCHEMA_VERSION, canonicalJson, signSyntheticEnvelope, verifySyntheticEnvelope };
export type { SyntheticEnvelopeInput };

type EventDeps = {
  pool?: ReturnType<typeof getPool>;
  secret?: string;
  sourceId?: string;
  hospitalId?: string;
  now?: () => Date;
};
type VerifiedEnvelope = NonNullable<ReturnType<typeof verifySyntheticEnvelope>>;
type EventResult = 'applied' | 'conflict';
type EventResponse = {
  status: number;
  body: {
    success: boolean;
    error?: string;
    message?: string;
    data?: Record<string, unknown>;
  };
};

export type AppointmentEventInput = Pick<Envelope, 'eventType' | 'targetReference' | 'payload' | 'observedAt'> & {
  eventReference?: string;
};

export async function applyAppointmentEvent(
  client: PoolClient,
  eventRowId: string,
  envelope: AppointmentEventInput,
  sourceId: string,
  hospitalId: string,
  provenance = 'signed-hospital-event',
): Promise<EventResult> {
  const eventReference = envelope.eventReference ?? sourceId;
  if (!['appointment.request-status', 'booking.confirmed'].includes(envelope.eventType) || !UUID.test(envelope.targetReference)) return 'conflict';

  const request = await client.query(`SELECT r.id,r.status,e.id AS episode_id,c.service_id
    FROM appointment_requests r
    JOIN episodes e ON e.id=r.episode_id
    JOIN citizen_cases c ON c.id=e.case_id
    WHERE r.id=$1 AND c.hospital_id=$2 AND c.status='active' AND e.participation='active'
      AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.case_id=c.id OR hl.episode_id=e.id) AND hl.state='suspended')
    FOR UPDATE OF r`, [envelope.targetReference, hospitalId]);
  if (!request.rowCount) return 'conflict';

  if (envelope.eventType === 'appointment.request-status') {
    const status = envelope.payload.status === 'accepted' ? 'hospital_accepted' : 'hospital_declined';
    if (request.rows[0].status === status) return 'applied';
    if (request.rows[0].status !== 'request_pending') return 'conflict';
    await client.query(`UPDATE appointment_requests
      SET status=$1,response_source=$2,response_author_reference=$3,responded_at=$4,hospital_response_reference=$5,version=version+1,updated_at=now()
      WHERE id=$6`, [status, provenance, sourceId, envelope.observedAt, envelope.payload.hospitalReference, envelope.targetReference]);
    await client.query(`INSERT INTO appointment_request_history(request_id,status,source,author_reference,external_reference,details,occurred_at)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [envelope.targetReference, status, provenance, sourceId, eventReference, JSON.stringify({ hospitalReference: envelope.payload.hospitalReference }), envelope.observedAt]);
    return 'applied';
  }

  if (envelope.eventType === 'booking.confirmed') {
    if (!['request_pending', 'hospital_accepted'].includes(request.rows[0].status)) return 'conflict';
    const slotReference = String(envelope.payload.slotReference);
    const bookingReference = String(envelope.payload.hospitalBookingReference);
    const slot = await client.query(`SELECT id FROM hospital_slots
      WHERE hospital_id=$1 AND service_id=$2 AND slot_reference=$3 AND status='published' FOR UPDATE`, [hospitalId, request.rows[0].service_id, slotReference]);
    if (!slot.rowCount) return 'conflict';
    const booking = await client.query(`INSERT INTO bookings(request_id,slot_reference,hospital_booking_reference,status,confirmed_at,source_event_id,source,source_event_reference)
      VALUES($1,$2,$3,'confirmed',$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id`, [envelope.targetReference, slotReference, bookingReference, envelope.observedAt, eventRowId, provenance, eventReference]);
    if (!booking.rowCount) return 'conflict';
    await client.query(`UPDATE appointment_requests
      SET status='hospital_confirmed',slot_reference=$1,response_source=$2,response_author_reference=$3,responded_at=$4,hospital_response_reference=$5,response_external_reference=$6,version=version+1,updated_at=now()
      WHERE id=$7`, [slotReference, provenance, sourceId, envelope.observedAt, bookingReference, eventReference, envelope.targetReference]);
    await client.query(`INSERT INTO appointment_request_history(request_id,status,source,author_reference,external_reference,details,occurred_at)
      VALUES($1,'hospital_confirmed',$2,$3,$4,$5,$6)`, [envelope.targetReference, provenance, sourceId, eventReference, JSON.stringify({ slotReference, hospitalBookingReference: bookingReference }), envelope.observedAt]);
    return 'applied';
  }

  return 'conflict';
}

async function applyDeceasedOfferEvent(client: PoolClient, envelope: Envelope, hospitalId: string): Promise<EventResult> {
  if (envelope.eventType === 'deceased-offer.received') {
    const episode = await client.query(`SELECT e.id
      FROM episodes e
      JOIN citizen_cases c ON c.id=e.case_id
      JOIN services s ON s.id=c.service_id
      JOIN recipient_intakes ri ON ri.episode_id=e.id
      WHERE e.id=$1 AND c.hospital_id=$2 AND c.status='active' AND e.participation='active'
        AND s.code='kidney' AND ri.requested_organ IN ('kidney','liver','heart','lung','pancreas')
        AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.case_id=c.id OR hl.episode_id=e.id) AND hl.state='suspended')
      FOR UPDATE OF e`, [envelope.targetReference, hospitalId]);
    if (!episode.rowCount) return 'conflict';
    const inserted = await client.query(`INSERT INTO deceased_offers(recipient_episode_id,external_reference,source_deadline,status)
      VALUES($1,$2,$3,'received') ON CONFLICT DO NOTHING RETURNING id`, [envelope.targetReference, envelope.payload.offerReference, envelope.payload.deadline ?? null]);
    return inserted.rowCount ? 'applied' : 'conflict';
  }

  if (!UUID.test(envelope.targetReference)) return 'conflict';
  const offer = await client.query(`SELECT o.id,o.status,o.acknowledgement_reference,o.response_reference,o.response_status
    FROM deceased_offers o
    JOIN episodes e ON e.id=o.recipient_episode_id
    JOIN citizen_cases c ON c.id=e.case_id
    JOIN services s ON s.id=c.service_id
    WHERE o.id=$1 AND c.hospital_id=$2 AND c.status='active' AND e.participation='active' AND s.code='kidney'
      AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.case_id=c.id OR hl.episode_id=e.id) AND hl.state='suspended')
    FOR UPDATE OF o`, [envelope.targetReference, hospitalId]);
  if (!offer.rowCount) return 'conflict';

  if (envelope.eventType === 'deceased-offer.acknowledged') {
    if (offer.rows[0].status === 'acknowledged' && offer.rows[0].acknowledgement_reference === envelope.payload.acknowledgementReference) return 'applied';
    if (offer.rows[0].status !== 'received') return 'conflict';
    await client.query(`UPDATE deceased_offers SET status='acknowledged',acknowledgement_reference=$1,updated_at=now() WHERE id=$2`, [envelope.payload.acknowledgementReference, envelope.targetReference]);
    return 'applied';
  }

  if (envelope.eventType === 'deceased-offer.responded') {
    if (offer.rows[0].status !== 'acknowledged') return 'conflict';
    await client.query(`UPDATE deceased_offers SET status='responded',response_reference=$1,response_status=$2,updated_at=now() WHERE id=$3`, [envelope.payload.responseReference, envelope.payload.responseStatus, envelope.targetReference]);
    return 'applied';
  }
  return 'conflict';
}

async function applyProjection(client: PoolClient, eventRowId: string, envelope: Envelope, sourceId: string, hospitalId: string): Promise<EventResult> {
  if (['appointment.request-status', 'booking.confirmed'].includes(envelope.eventType)) {
    return applyAppointmentEvent(client, eventRowId, { ...envelope, eventReference: envelope.eventId }, sourceId, hospitalId);
  }
  if (envelope.eventType === 'blood.request-closed') {
    const closed = await client.query(`UPDATE blood_requests SET status='closed',source=$1,version=version+1,updated_at=now()
      WHERE id=$2 AND hospital_id=$3 AND status='published' RETURNING id`, [sourceId, envelope.targetReference, hospitalId]);
    if (closed.rowCount) return 'applied';
    const existing = await client.query(`SELECT 1 FROM blood_requests WHERE id=$1 AND hospital_id=$2 AND status='closed'`, [envelope.targetReference, hospitalId]);
    return existing.rowCount ? 'applied' : 'conflict';
  }
  if (envelope.eventType.startsWith('deceased-offer.')) return applyDeceasedOfferEvent(client, envelope, hospitalId);
  return 'conflict';
}

async function processVerifiedEnvelope(client: PoolClient, verified: VerifiedEnvelope): Promise<EventResponse> {
  const { envelope, payloadHash, envelopeHash, signatureHash } = verified;
  const duplicate = await client.query(`SELECT id,source_event_id,envelope_hash,processing_result,received_at
    FROM hospital_source_events
    WHERE source_namespace=$1 AND hospital_id=$2 AND (source_event_id=$3 OR nonce=$4) FOR UPDATE`, [envelope.sourceId, envelope.hospitalId, envelope.eventId, envelope.nonce]);
  if (duplicate.rowCount) {
    const prior = duplicate.rows[0];
    const exact = prior.source_event_id === envelope.eventId && prior.envelope_hash && Buffer.from(prior.envelope_hash).equals(envelopeHash);
    return exact
      ? { status: 200, body: { success: true, data: { id: prior.id, eventId: prior.source_event_id, processingResult: prior.processing_result, receivedAt: prior.received_at, replay: true } } }
      : { status: 409, body: { success: false, error: 'event_conflict', message: 'Hospital event conflicts with prior evidence' } };
  }

  const hospital = await client.query(`SELECT id FROM hospitals WHERE id=$1 AND synthetic=true`, [envelope.hospitalId]);
  const last = await client.query(`SELECT source_version FROM hospital_source_events
    WHERE source_namespace=$1 AND hospital_id=$2 AND schema_version=$3 AND source_version IS NOT NULL
    ORDER BY source_version DESC LIMIT 1 FOR UPDATE`, [envelope.sourceId, envelope.hospitalId, SCHEMA_VERSION]);
  const expected = Number(last.rows[0]?.source_version ?? 0) + 1;
  if (!hospital.rowCount || envelope.sequence !== expected) {
    return { status: 409, body: { success: false, error: 'event_order_rejected', message: 'Hospital event ordering was rejected' } };
  }

  const inserted = await client.query(`INSERT INTO hospital_source_events(source_namespace,hospital_id,source_event_id,event_type,target_reference,source_version,payload_hash,payload,occurred_at,processing_result,schema_version,issued_at,observed_at,nonce,envelope_hash,signature_hash,author_reference)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'recorded',$10,$11,$12,$13,$14,$15,$16)
    RETURNING id,source_event_id,received_at`, [envelope.sourceId, envelope.hospitalId, envelope.eventId, envelope.eventType, envelope.targetReference, envelope.sequence, payloadHash, envelope.payload, envelope.observedAt, envelope.schemaVersion, envelope.issuedAt, envelope.observedAt, envelope.nonce, envelopeHash, signatureHash, envelope.sourceId]);
  const row = inserted.rows[0];
  const processingResult = await applyProjection(client, row.id, envelope, envelope.sourceId, envelope.hospitalId);
  await client.query(`UPDATE hospital_source_events SET processing_result=$1 WHERE id=$2`, [processingResult, row.id]);
  if (processingResult === 'conflict') {
    await client.query(`INSERT INTO follow_up_tasks(episode_id,conflict_reference,assigned_team,cause,status,originating_event_id)
      SELECT CASE
        WHEN $3 IN ('appointment.request-status','booking.confirmed') THEN (SELECT episode_id FROM appointment_requests WHERE id=$4)
        WHEN $3 LIKE 'deceased-offer.%' THEN (SELECT recipient_episode_id FROM deceased_offers WHERE id=$4)
        ELSE NULL END,
        $1,'coordination','hospital_event_conflict','pending',$2
      ON CONFLICT (originating_event_id) WHERE originating_event_id IS NOT NULL DO NOTHING`, [envelope.eventId, row.id, envelope.eventType, envelope.targetReference]);
  }
  await client.query(`INSERT INTO audit_events(action,target_reference,source,idempotency_reference,details)
    VALUES($1,$2,$3,$4,$5)`, [`hospital_event_${processingResult}`, envelope.targetReference, envelope.sourceId, envelope.eventId, JSON.stringify({ eventType: envelope.eventType, sequence: envelope.sequence, schemaVersion: envelope.schemaVersion, processingResult })]);
  return { status: 201, body: { success: true, data: { id: row.id, eventId: row.source_event_id, processingResult, receivedAt: row.received_at, replay: false } } };
}

async function inEventTransaction(pool: ReturnType<typeof getPool>, sourceId: string, hospitalId: string, work: (client: PoolClient) => Promise<EventResponse>): Promise<EventResponse> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text, 0))`, [sourceId, hospitalId]);
    const result = await work(client);
    await client.query(result.status < 400 ? 'COMMIT' : 'ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function ingestSyntheticEnvelope(value: unknown, config: RuntimeConfig, deps: EventDeps = {}): Promise<EventResponse> {
  if (config.mode !== 'synthetic') return { status: 404, body: { success: false, error: 'not_found', message: 'Route not found' } };
  const secret = deps.secret ?? process.env.SYNTHETIC_HOSPITAL_SIGNING_SECRET ?? '';
  const sourceId = deps.sourceId ?? process.env.SYNTHETIC_HOSPITAL_SOURCE_ID ?? 'synthetic-hospital';
  const hospitalId = deps.hospitalId ?? process.env.SYNTHETIC_HOSPITAL_ID ?? '';
  if (secret.length < 32 || !UUID.test(hospitalId)) return { status: 503, body: { success: false, error: 'integration_unavailable', message: 'Hospital integration is unavailable' } };
  const verified = verifySyntheticEnvelope(value, { secret, sourceId, hospitalId, now: deps.now?.() });
  if (!verified) return { status: 401, body: { success: false, error: 'invalid_envelope', message: 'Hospital event was rejected' } };
  try {
    return await inEventTransaction(deps.pool ?? getPool(), sourceId, hospitalId, (client) => processVerifiedEnvelope(client, verified));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') return { status: 409, body: { success: false, error: 'event_conflict', message: 'Hospital event conflicts with prior evidence' } };
    throw error;
  }
}

export async function runSyntheticScenario(input: {
  hospitalId: string;
  eventType: string;
  targetReference: string;
  payload: Record<string, Json>;
  idempotencyKey: string;
}, config: RuntimeConfig, deps: Pick<EventDeps, 'pool' | 'secret' | 'sourceId' | 'now'> = {}): Promise<EventResponse> {
  if (config.mode !== 'synthetic') return { status: 404, body: { success: false, error: 'not_found', message: 'Route not found' } };
  const secret = deps.secret ?? process.env.SYNTHETIC_HOSPITAL_SIGNING_SECRET ?? '';
  const sourceId = deps.sourceId ?? process.env.SYNTHETIC_HOSPITAL_SOURCE_ID ?? 'synthetic-hospital';
  if (secret.length < 32 || !UUID.test(input.hospitalId)) return { status: 503, body: { success: false, error: 'integration_unavailable', message: 'Hospital integration is unavailable' } };
  const eventId = `synthetic-${crypto.createHash('sha256').update(input.idempotencyKey).digest('hex').slice(0, 40)}`;
  try {
    return await inEventTransaction(deps.pool ?? getPool(), sourceId, input.hospitalId, async (client) => {
      const prior = await client.query(`SELECT id,source_event_id,event_type,target_reference,payload,processing_result,received_at
        FROM hospital_source_events WHERE source_namespace=$1 AND hospital_id=$2 AND source_event_id=$3 FOR UPDATE`, [sourceId, input.hospitalId, eventId]);
      if (prior.rowCount) {
        const row = prior.rows[0];
        const exact = row.event_type === input.eventType && row.target_reference === input.targetReference && canonicalJson(row.payload) === canonicalJson(input.payload);
        return exact
          ? { status: 200, body: { success: true, data: { id: row.id, eventId: row.source_event_id, processingResult: row.processing_result, receivedAt: row.received_at, replay: true } } }
          : { status: 409, body: { success: false, error: 'event_conflict', message: 'Idempotency key conflicts with prior evidence' } };
      }
      const sequence = await client.query(`SELECT COALESCE(MAX(source_version),0)+1 AS next
        FROM hospital_source_events WHERE source_namespace=$1 AND hospital_id=$2 AND schema_version=$3`, [sourceId, input.hospitalId, SCHEMA_VERSION]);
      const now = (deps.now?.() ?? new Date()).toISOString();
      const envelope = signSyntheticEnvelope({
        sourceId,
        hospitalId: input.hospitalId,
        eventId,
        eventType: input.eventType,
        schemaVersion: SCHEMA_VERSION,
        issuedAt: now,
        observedAt: now,
        nonce: crypto.randomBytes(18).toString('base64url'),
        sequence: Number(sequence.rows[0].next),
        targetReference: input.targetReference,
        payload: input.payload,
      }, secret);
      const verified = verifySyntheticEnvelope(envelope, { secret, sourceId, hospitalId: input.hospitalId, now: new Date(now) });
      if (!verified) return { status: 422, body: { success: false, error: 'validation_error', message: 'Synthetic scenario was rejected' } };
      return processVerifiedEnvelope(client, verified);
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '23505') return { status: 409, body: { success: false, error: 'event_conflict', message: 'Hospital event conflicts with prior evidence' } };
    throw error;
  }
}

export function createHospitalEventsRouter(config: RuntimeConfig, deps: EventDeps = {}) {
  const router = express.Router();
  router.post('/', async (req, res, next) => {
    try {
      const result = await ingestSyntheticEnvelope(req.body, config, deps);
      return res.status(result.status).json(result.body);
    } catch (error) {
      return next(error);
    }
  });
  return router;
}
