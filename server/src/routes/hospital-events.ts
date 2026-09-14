import crypto from 'node:crypto';
import express from 'express';
import type { PoolClient } from 'pg';
import { getPool } from '../db/pool.js';
import type { RuntimeConfig } from '../runtime/config.js';

const SCHEMA_VERSION = 'synthetic-hospital-event.v1';
const EVENT_TYPES = new Set(['appointment.request-status', 'booking.confirmed', 'booking.cancelled', 'case.linkage-status']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const NONCE = /^[A-Za-z0-9_-]{22,128}$/;

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Envelope = {
  sourceId: string;
  hospitalId: string;
  eventId: string;
  eventType: string;
  schemaVersion: string;
  issuedAt: string;
  observedAt: string;
  nonce: string;
  sequence: number;
  targetReference: string;
  payloadHash: string;
  payload: Record<string, Json>;
  signature: string;
};
export type SyntheticEnvelopeInput = Omit<Envelope, 'payloadHash' | 'signature'>;

function canonicalJson(value: Json): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Invalid JSON number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
}

const signingContent = (envelope: Omit<Envelope, 'payload' | 'signature'>): Json => ({
  eventId: envelope.eventId,
  eventType: envelope.eventType,
  hospitalId: envelope.hospitalId,
  issuedAt: envelope.issuedAt,
  nonce: envelope.nonce,
  observedAt: envelope.observedAt,
  payloadHash: envelope.payloadHash,
  schemaVersion: envelope.schemaVersion,
  sequence: envelope.sequence,
  sourceId: envelope.sourceId,
  targetReference: envelope.targetReference,
});

function hmac(secret: string, content: Json): Buffer {
  return crypto.createHmac('sha256', secret).update(canonicalJson(content)).digest();
}

function exactObject(value: unknown, allowed: Set<string>): value is Record<string, Json> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every((key) => allowed.has(key)));
}

function validPayload(eventType: string, value: unknown): value is Record<string, Json> {
  if (eventType === 'appointment.request-status') return exactObject(value, new Set(['status', 'hospitalReference'])) && ['accepted', 'declined'].includes(String(value.status)) && SAFE_ID.test(String(value.hospitalReference ?? ''));
  if (eventType === 'booking.confirmed') return exactObject(value, new Set(['slotReference', 'hospitalBookingReference'])) && SAFE_ID.test(String(value.slotReference ?? '')) && SAFE_ID.test(String(value.hospitalBookingReference ?? ''));
  if (eventType === 'booking.cancelled') return exactObject(value, new Set(['hospitalBookingReference', 'reasonCode'])) && SAFE_ID.test(String(value.hospitalBookingReference ?? '')) && (value.reasonCode === undefined || SAFE_ID.test(String(value.reasonCode)));
  if (eventType === 'case.linkage-status') return exactObject(value, new Set(['state', 'hospitalReference'])) && ['verified', 'suspended'].includes(String(value.state)) && SAFE_ID.test(String(value.hospitalReference ?? ''));
  return false;
}

type VerifyOptions = { secret: string; sourceId: string; hospitalId: string; now?: Date };
function verifySyntheticEnvelope(value: unknown, options: VerifyOptions): { envelope: Envelope; payloadHash: Buffer; envelopeHash: Buffer; signatureHash: Buffer } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const keys = new Set(['sourceId', 'hospitalId', 'eventId', 'eventType', 'schemaVersion', 'issuedAt', 'observedAt', 'nonce', 'sequence', 'targetReference', 'payloadHash', 'payload', 'signature']);
  if (Object.keys(raw).length !== keys.size || !Object.keys(raw).every((key) => keys.has(key))) return null;
  if (raw.sourceId !== options.sourceId || raw.hospitalId !== options.hospitalId || !UUID.test(String(raw.hospitalId)) || raw.schemaVersion !== SCHEMA_VERSION || !EVENT_TYPES.has(String(raw.eventType)) || !SAFE_ID.test(String(raw.eventId)) || !SAFE_ID.test(String(raw.targetReference)) || !NONCE.test(String(raw.nonce)) || !Number.isSafeInteger(raw.sequence) || Number(raw.sequence) < 1 || !/^[a-f0-9]{64}$/i.test(String(raw.payloadHash)) || !/^[a-f0-9]{64}$/i.test(String(raw.signature))) return null;
  const issued = new Date(String(raw.issuedAt)); const observed = new Date(String(raw.observedAt)); const now = options.now ?? new Date();
  if (!Number.isFinite(issued.getTime()) || !Number.isFinite(observed.getTime()) || issued.toISOString() !== raw.issuedAt || observed.toISOString() !== raw.observedAt || Math.abs(now.getTime() - issued.getTime()) > 5 * 60_000 || observed.getTime() > issued.getTime() + 5 * 60_000 || issued.getTime() - observed.getTime() > 24 * 60 * 60_000) return null;
  const metadata = signingContent(raw as Omit<Envelope, 'payload' | 'signature'>);
  const expectedSignature = hmac(options.secret, metadata); const suppliedSignature = Buffer.from(String(raw.signature), 'hex');
  if (suppliedSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(suppliedSignature, expectedSignature)) return null;
  if (!validPayload(String(raw.eventType), raw.payload)) return null;
  const payloadHash = crypto.createHash('sha256').update(canonicalJson(raw.payload)).digest(); const suppliedHash = Buffer.from(String(raw.payloadHash), 'hex');
  if (suppliedHash.length !== payloadHash.length || !crypto.timingSafeEqual(suppliedHash, payloadHash)) return null;
  return { envelope: raw as Envelope, payloadHash, envelopeHash: crypto.createHash('sha256').update(canonicalJson(metadata)).digest(), signatureHash: crypto.createHash('sha256').update(suppliedSignature).digest() };
}

function signSyntheticEnvelope(input: SyntheticEnvelopeInput, secret: string): Envelope {
  const payloadHash = crypto.createHash('sha256').update(canonicalJson(input.payload)).digest('hex');
  const metadata = { ...input, payloadHash };
  const signature = hmac(secret, signingContent(metadata)).toString('hex');
  return { ...input, payloadHash, signature };
}

type EventDeps = { pool?: ReturnType<typeof getPool>; secret?: string; sourceId?: string; hospitalId?: string; now?: () => Date };

export type AppointmentEventInput = Pick<Envelope, 'eventType' | 'targetReference' | 'payload' | 'observedAt'> & { eventReference?: string };
export async function applyAppointmentEvent(client: PoolClient, eventRowId: string, envelope: AppointmentEventInput, sourceId: string, hospitalId: string, provenance = 'signed-hospital-event'): Promise<'applied' | 'conflict'> {
  const eventReference = envelope.eventReference ?? sourceId;
  if (!['appointment.request-status', 'booking.confirmed'].includes(envelope.eventType)) return 'conflict';
  if (!UUID.test(envelope.targetReference)) return 'conflict';
  const request = await client.query(`SELECT r.id,r.status,e.id AS episode_id,c.service_id
    FROM appointment_requests r JOIN episodes e ON e.id=r.episode_id JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
    WHERE r.id=$1 AND c.hospital_id=$2 AND c.status='active' AND e.participation='active'
      AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.case_id=c.id OR hl.episode_id=e.id) AND hl.state='suspended')
    FOR UPDATE OF r`, [envelope.targetReference, hospitalId]);
  if (!request.rowCount) return 'conflict';

  if (envelope.eventType === 'appointment.request-status') {
    const status = envelope.payload.status === 'accepted' ? 'hospital_accepted' : 'hospital_declined';
    if (request.rows[0].status === status) return 'applied';
    if (request.rows[0].status !== 'request_pending') return 'conflict';
    await client.query(`UPDATE appointment_requests SET status=$1,response_source=$2,response_author_reference=$3,responded_at=$4,hospital_response_reference=$5,version=version+1,updated_at=now() WHERE id=$6`, [status, provenance, sourceId, envelope.observedAt, envelope.payload.hospitalReference, envelope.targetReference]);
    await client.query(`INSERT INTO appointment_request_history(request_id,status,source,author_reference,external_reference,details,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, [envelope.targetReference, status, provenance, sourceId, eventReference, JSON.stringify({ hospitalReference: envelope.payload.hospitalReference }), envelope.observedAt]);
    return 'applied';
  }

  if (!['request_pending', 'hospital_accepted'].includes(request.rows[0].status)) return 'conflict';
  const slotReference = String(envelope.payload.slotReference);
  const bookingReference = String(envelope.payload.hospitalBookingReference);
  const slot = await client.query(`SELECT id FROM hospital_slots WHERE hospital_id=$1 AND service_id=$2 AND slot_reference=$3 AND status='published' FOR UPDATE`, [hospitalId, request.rows[0].service_id, slotReference]);
  if (!slot.rowCount) return 'conflict';
  const booking = await client.query(`INSERT INTO bookings(request_id,slot_reference,hospital_booking_reference,status,confirmed_at,source_event_id,source,source_event_reference)
    VALUES($1,$2,$3,'confirmed',$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id`, [envelope.targetReference, slotReference, bookingReference, envelope.observedAt, eventRowId, provenance, eventReference]);
  if (!booking.rowCount) return 'conflict';
  await client.query(`UPDATE appointment_requests SET status='hospital_confirmed',slot_reference=$1,response_source=$2,response_author_reference=$3,responded_at=$4,hospital_response_reference=$5,response_external_reference=$6,version=version+1,updated_at=now() WHERE id=$7`, [slotReference, provenance, sourceId, envelope.observedAt, bookingReference, eventReference, envelope.targetReference]);
  await client.query(`INSERT INTO appointment_request_history(request_id,status,source,author_reference,external_reference,details,occurred_at) VALUES($1,'hospital_confirmed',$2,$3,$4,$5,$6)`, [envelope.targetReference, provenance, sourceId, eventReference, JSON.stringify({ slotReference, hospitalBookingReference: bookingReference }), envelope.observedAt]);
  return 'applied';
}

export function createHospitalEventsRouter(config: RuntimeConfig, deps: EventDeps = {}) {
  const router = express.Router();
  router.post('/', async (req, res, next) => {
    if (config.mode !== 'synthetic') return res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' });
    const secret = deps.secret ?? process.env.SYNTHETIC_HOSPITAL_SIGNING_SECRET ?? '';
    const sourceId = deps.sourceId ?? process.env.SYNTHETIC_HOSPITAL_SOURCE_ID ?? 'synthetic-hospital';
    const hospitalId = deps.hospitalId ?? process.env.SYNTHETIC_HOSPITAL_ID ?? '';
    if (secret.length < 32 || !UUID.test(hospitalId)) return res.status(503).json({ success: false, error: 'integration_unavailable', message: 'Hospital integration is unavailable' });
    const verified = verifySyntheticEnvelope(req.body, { secret, sourceId, hospitalId, now: deps.now?.() });
    if (!verified) return res.status(401).json({ success: false, error: 'invalid_envelope', message: 'Hospital event was rejected' });
    const { envelope, payloadHash, envelopeHash, signatureHash } = verified; const pool = deps.pool ?? getPool(); const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text, 0))`, [sourceId, hospitalId]);
      const duplicate = await client.query(`SELECT id,source_event_id,envelope_hash,processing_result FROM hospital_source_events WHERE source_namespace=$1 AND hospital_id=$2 AND (source_event_id=$3 OR nonce=$4) FOR UPDATE`, [sourceId, hospitalId, envelope.eventId, envelope.nonce]);
      if (duplicate.rowCount) {
        const prior = duplicate.rows[0]; const exact = prior.source_event_id === envelope.eventId && prior.envelope_hash && Buffer.from(prior.envelope_hash).equals(envelopeHash);
        await client.query(exact ? 'COMMIT' : 'ROLLBACK');
        return exact ? res.json({ success: true, data: { id: prior.id, eventId: prior.source_event_id, processingResult: prior.processing_result, replay: true } }) : res.status(409).json({ success: false, error: 'event_conflict', message: 'Hospital event conflicts with prior evidence' });
      }
      const hospital = await client.query(`SELECT id FROM hospitals WHERE id=$1 AND synthetic=true`, [hospitalId]);
      const last = await client.query(`SELECT source_version FROM hospital_source_events WHERE source_namespace=$1 AND hospital_id=$2 AND schema_version=$3 AND source_version IS NOT NULL ORDER BY source_version DESC LIMIT 1 FOR UPDATE`, [sourceId, hospitalId, SCHEMA_VERSION]);
      const expected = Number(last.rows[0]?.source_version ?? 0) + 1;
      if (!hospital.rowCount || envelope.sequence !== expected) { await client.query('ROLLBACK'); return res.status(409).json({ success: false, error: 'event_order_rejected', message: 'Hospital event ordering was rejected' }); }
      const inserted = await client.query(`INSERT INTO hospital_source_events(source_namespace,hospital_id,source_event_id,event_type,target_reference,source_version,payload_hash,payload,occurred_at,processing_result,schema_version,issued_at,observed_at,nonce,envelope_hash,signature_hash,author_reference)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'recorded',$10,$11,$12,$13,$14,$15,$16)
        RETURNING id,source_event_id,processing_result,received_at`, [sourceId, hospitalId, envelope.eventId, envelope.eventType, envelope.targetReference, envelope.sequence, payloadHash, envelope.payload, envelope.observedAt, envelope.schemaVersion, envelope.issuedAt, envelope.observedAt, envelope.nonce, envelopeHash, signatureHash, sourceId]);
      const processingResult = await applyAppointmentEvent(client, inserted.rows[0].id, { ...envelope, eventReference: envelope.eventId }, sourceId, hospitalId);
      await client.query(`UPDATE hospital_source_events SET processing_result=$1 WHERE id=$2`, [processingResult, inserted.rows[0].id]);
      if (processingResult === 'conflict') {
        await client.query(`INSERT INTO follow_up_tasks(episode_id,conflict_reference,assigned_team,cause,status,originating_event_id)
          SELECT (SELECT e.id FROM appointment_requests r JOIN episodes e ON e.id=r.episode_id WHERE r.id=$3),$1,'coordination','hospital_event_conflict','pending',$2
          ON CONFLICT (originating_event_id) WHERE originating_event_id IS NOT NULL DO NOTHING`, [envelope.eventId, inserted.rows[0].id, envelope.targetReference]);
      }
      await client.query(`INSERT INTO audit_events(action,target_reference,source,idempotency_reference,details) VALUES($1,$2,$3,$4,$5)`, [`hospital_event_${processingResult}`, envelope.targetReference, sourceId, envelope.eventId, JSON.stringify({ eventType: envelope.eventType, sequence: envelope.sequence, schemaVersion: envelope.schemaVersion, processingResult })]);
      await client.query('COMMIT'); const row = inserted.rows[0];
      return res.status(201).json({ success: true, data: { id: row.id, eventId: row.source_event_id, processingResult, receivedAt: row.received_at, replay: false } });
    } catch (error: unknown) {
      await client.query('ROLLBACK').catch(() => {});
      if (error instanceof Error && 'code' in error && error.code === '23505') return res.status(409).json({ success: false, error: 'event_conflict', message: 'Hospital event conflicts with prior evidence' });
      return next(error);
    } finally { client.release(); }
  });
  return router;
}

export { SCHEMA_VERSION, canonicalJson, signSyntheticEnvelope, verifySyntheticEnvelope };
