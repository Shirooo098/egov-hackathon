import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { getPool } from '../db/pool.js';
import { requireSession, requireRole } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import type { Account } from '../auth/service.js';
import { sanitizeMessageBody } from './platform.js';

const router = express.Router();
const ZERO_UUID = '00000000-0000-0000-0000-000000000000';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIVE_PAIR_STATES = ['awaiting_citizen_acceptance', 'awaiting_schedule', 'awaiting_consent'];
const READABLE_CHAT_STATES = ['awaiting_schedule', 'awaiting_consent', 'withdrawn'];
const PAIR_RESPONSE_FIELDS = new Set(['response', 'declineReasonCode', 'idempotencyKey', 'targetVersion']);

const fail = (res: Response, status: number, error: string, message: string) => res.status(status).json({ success: false, error, message });
const ok = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
const requireAccount = (req: Request): Account => { if (!req.account) throw new Error('Authentication required'); return req.account; };
const boundedLimit = (value: unknown, ceiling: number) => Math.min(Math.max(Number(value || ceiling), 1), ceiling);
const isIdempotencyKey = (value: unknown) => typeof value === 'string' && value.length >= 8 && value.length <= 200;
const isObviousContact = (body: string) => /(?:\b\+?\d[\d\s().-]{7,}\d\b|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|https?:\/\/|www\.|@[A-Za-z0-9_]{2,})/iu.test(body);
const isOffsetIsoInstant = (value: unknown) => typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
const syntheticOnly = (_req: Request, res: Response, next: NextFunction) => process.env.EBUHAY_MODE === 'synthetic' ? next() : fail(res, 404, 'not_found', 'Route not found');
router.use(syntheticOnly);

function parseCandidateCursor(value: unknown): Array<string | null> | null {
  if (!value) return [null, ZERO_UUID, null, ZERO_UUID];
  const parts = String(value).split('|');
  if (parts.length !== 4 || Number.isNaN(Date.parse(parts[0])) || Number.isNaN(Date.parse(parts[2]))) return null;
  return parts;
}

function parseMessageCursor(value: unknown): Array<string | null> | null {
  if (!value) return [null, ZERO_UUID];
  const parts = String(value).split('|');
  if (parts.length !== 2 || Number.isNaN(Date.parse(parts[0]))) return null;
  return parts;
}

async function rollbackFail(client: PoolClient, res: Response, status: number, error: string, message: string) {
  await client.query('ROLLBACK');
  return fail(res, status, error, message);
}

async function notifyPairParticipants(client: PoolClient, pairId: string) {
  await client.query(`INSERT INTO notifications(recipient_account_id, template, safe_reference, channel, delivery_status, delivered_at)
    SELECT DISTINCT c.account_id, 'coordination_update', $1::text, 'in_app', 'delivered', now()
    FROM pair_proposals p
    JOIN episodes e ON e.id IN (p.own_episode_id, p.counterpart_episode_id)
    JOIN citizen_cases c ON c.id=e.case_id
    WHERE p.id=$1::uuid AND c.account_id IS NOT NULL`, [pairId]);

  await client.query(`INSERT INTO notifications(recipient_account_id, template, safe_reference, channel, delivery_status)
    SELECT DISTINCT c.account_id, 'coordination_update', $1::text, 'external_sms', 'pending'
    FROM pair_proposals p
    JOIN episodes e ON e.id IN (p.own_episode_id, p.counterpart_episode_id)
    JOIN citizen_cases c ON c.id=e.case_id
    JOIN notification_preferences pref ON pref.account_id=c.account_id
    WHERE p.id=$1::uuid AND c.account_id IS NOT NULL AND pref.sms_consent=true AND pref.phone_number IS NOT NULL`, [pairId]);
}

router.get('/hospital/candidates', requireSession, async (req, res, next) => {
  try {
    if (requireAccount(req).role !== 'coordinator' || !requireAccount(req).hospitalId) return fail(res, 403, 'forbidden', 'Candidate access denied');
    const cursor = parseCandidateCursor(req.query.cursor);
    if (!cursor) return fail(res, 422, 'validation_error', 'Invalid candidate cursor');
    const limit = boundedLimit(req.query.limit, 50);
    const [recipientTime, recipientId, donorTime, donorId] = cursor;
    const result = await getPool().query(`SELECT
        re.id AS recipient_episode_id, re.version AS recipient_version,
        de.id AS donor_episode_id, de.version AS donor_version,
        rc.hospital_id, rc.service_id,
        re.created_at AS recipient_created_at, de.created_at AS donor_created_at
      FROM episodes re
      JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN services svc ON svc.id=rc.service_id
      JOIN recipient_intakes ri ON ri.episode_id=re.id
      CROSS JOIN episodes de
      JOIN citizen_cases dc ON dc.id=de.case_id
      JOIN donor_intakes di ON di.episode_id=de.id
      WHERE rc.hospital_id=dc.hospital_id AND rc.service_id=dc.service_id
        AND rc.hospital_id=$1
        AND svc.code=ANY($2::text[])
        AND re.participation='active' AND de.participation='active'
        AND re.lifecycle='active' AND de.lifecycle='active'
        AND rc.status='active' AND dc.status='active'
        AND EXISTS(SELECT 1 FROM hospital_linkages rl WHERE rl.case_id=rc.id AND rl.episode_id=re.id AND rl.state='verified')
        AND EXISTS(SELECT 1 FROM hospital_linkages dl WHERE dl.case_id=dc.id AND dl.episode_id=de.id AND dl.state='verified')
        AND NOT EXISTS(SELECT 1 FROM pair_proposals p
          WHERE p.state=ANY($3::text[])
          AND (p.own_episode_id IN(re.id,de.id) OR p.counterpart_episode_id IN(re.id,de.id)))
        AND ($4::timestamptz IS NULL OR
          (re.created_at,re.id,de.created_at,de.id) > ($4::timestamptz,$5::uuid,$6::timestamptz,$7::uuid))
      ORDER BY re.created_at,re.id,de.created_at,de.id
      LIMIT $8`, [requireAccount(req).hospitalId, requireAccount(req).serviceScope || [], ACTIVE_PAIR_STATES, recipientTime, recipientId, donorTime, donorId, limit]);
    const items = result.rows.map((row) => ({
      candidateId: `${row.recipient_episode_id}:${row.donor_episode_id}`,
      targetVersion: `${row.recipient_version}:${row.donor_version}`,
      recipient: {
        episodeId: row.recipient_episode_id, role: 'recipient',
        createdAt: row.recipient_created_at,
      },
      donor: {
        episodeId: row.donor_episode_id, role: 'donor',
        createdAt: row.donor_created_at,
      },
      hospitalId: row.hospital_id, serviceId: row.service_id, coordinationStatus: 'available',
    }));
    const last = result.rows.at(-1);
    const nextCursor = result.rows.length === limit && last
      ? `${new Date(last.recipient_created_at).toISOString()}|${last.recipient_episode_id}|${new Date(last.donor_created_at).toISOString()}|${last.donor_episode_id}`
      : null;
    return ok(res, { items, nextCursor });
  } catch (error) { return next(error); }
});

router.post('/hospital/candidates/:id/select', requireSession, requireSameOrigin, async (req, res, next) => {
  let client;
  try {
    client = await getPool().connect();
    const [recipientId, donorId] = String(req.params.id).split(':');
    const { reviewerAccountId, targetVersion, idempotencyKey } = req.body || {};
    if (!UUID.test(recipientId) || !UUID.test(donorId) || !UUID.test(String(reviewerAccountId)) || requireAccount(req).role !== 'coordinator' || !isIdempotencyKey(idempotencyKey) || typeof targetVersion !== 'string') {
      return fail(res, 422, 'validation_error', 'Invalid candidate selection');
    }
    await client.query('BEGIN');
    const eligible = await client.query(`SELECT
        re.version AS recipient_version, de.version AS donor_version,
        rc.account_id AS recipient_account_id, dc.account_id AS donor_account_id,
        rc.hospital_id, rc.service_id, svc.code AS service_code
      FROM episodes re
      JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN services svc ON svc.id=rc.service_id
      JOIN recipient_intakes ri ON ri.episode_id=re.id
      CROSS JOIN episodes de
      JOIN citizen_cases dc ON dc.id=de.case_id
      JOIN donor_intakes di ON di.episode_id=de.id
      WHERE re.id=$1 AND de.id=$2
        AND rc.hospital_id=dc.hospital_id AND rc.service_id=dc.service_id
        AND re.participation='active' AND de.participation='active'
        AND re.lifecycle='active' AND de.lifecycle='active'
        AND rc.status='active' AND dc.status='active'
        AND EXISTS(SELECT 1 FROM hospital_linkages rl WHERE rl.case_id=rc.id AND rl.episode_id=re.id AND rl.state='verified')
        AND EXISTS(SELECT 1 FROM hospital_linkages dl WHERE dl.case_id=dc.id AND dl.episode_id=de.id AND dl.state='verified')
      FOR UPDATE OF re,de,ri,di`, [recipientId, donorId]);
    if (!eligible.rowCount) return rollbackFail(client, res, 409, 'conflict', 'Candidate is no longer available');
    const candidate = eligible.rows[0];
    if (targetVersion !== `${candidate.recipient_version}:${candidate.donor_version}`) {
      return rollbackFail(client, res, 409, 'conflict', 'Candidate version is stale');
    }
    if (candidate.hospital_id !== requireAccount(req).hospitalId) return rollbackFail(client, res, 403, 'forbidden', 'Candidate outside actor scope');
    const actorCoordinator = requireAccount(req).role === 'coordinator' && (requireAccount(req).serviceScope || []).includes(candidate.service_code);
    if (!actorCoordinator) return rollbackFail(client, res, 403, 'forbidden', 'Candidate outside actor scope');
    const reviewerGrant = await client.query(`SELECT 1 FROM pair_reviewer_grants
      JOIN accounts a ON a.id=pair_reviewer_grants.account_id
      JOIN services s ON s.id=pair_reviewer_grants.service_id
      WHERE pair_reviewer_grants.account_id=$1 AND pair_reviewer_grants.hospital_id=$2 AND pair_reviewer_grants.service_id=$3 AND pair_reviewer_grants.revoked_at IS NULL
        AND a.status='active' AND a.role IN ('coordinator','clinical_lead','hospital_admin') AND a.hospital_id=$2 AND s.code=ANY(a.service_scope::text[])`,
    [reviewerAccountId, candidate.hospital_id, candidate.service_id]);
    if (!reviewerGrant.rowCount) return rollbackFail(client, res, 403, 'forbidden', 'Reviewer is not permitted');
    const repeated = await client.query(`SELECT id,state,version,reviewer_account_id AS "reviewerAccountId",
        own_episode_id AS "ownEpisodeId",counterpart_episode_id AS "counterpartEpisodeId"
      FROM pair_proposals WHERE selected_by=$1 AND selection_idempotency_key=$2
        AND own_episode_id=$3 AND counterpart_episode_id=$4 AND reviewer_account_id=$5`,
    [requireAccount(req).id, idempotencyKey, recipientId, donorId, reviewerAccountId]);
    if (repeated.rowCount) {
      const expectedVersion = `${candidate.recipient_version}:${candidate.donor_version}`;
      if (targetVersion !== expectedVersion) return rollbackFail(client, res, 409, 'conflict', 'Candidate version is stale');
      await client.query('COMMIT');
      return ok(res, { ...repeated.rows[0], idempotent: true });
    }
    const conflict = await client.query(`SELECT 1 FROM pair_proposals
      WHERE state=ANY($1::text[]) AND
        (own_episode_id IN($2,$3) OR counterpart_episode_id IN($2,$3))`,
    [ACTIVE_PAIR_STATES, recipientId, donorId]);
    if (conflict.rowCount) return rollbackFail(client, res, 409, 'conflict', 'Candidate is no longer available');
    const inserted = await client.query(`INSERT INTO pair_proposals(
        own_episode_id,counterpart_episode_id,reviewer_account_id,state,status,selected_by,selection_idempotency_key)
      VALUES($1,$2,$3,'awaiting_citizen_acceptance','awaiting_citizen_acceptance',$4,$5)
      RETURNING id,state,version,reviewer_account_id AS "reviewerAccountId"`,
    [recipientId, donorId, reviewerAccountId, requireAccount(req).id, idempotencyKey]);
    await notifyPairParticipants(client, inserted.rows[0].id);
    await client.query('COMMIT');
    return ok(res, inserted.rows[0], 201);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error instanceof Error && 'code' in error && error.code === '23505') return fail(res, 409, 'conflict', 'Candidate is no longer available');
    return next(error);
  } finally { if (client) client.release(); }
});

router.get('/pairs/current', requireSession, async (req, res, next) => {
  try {
    const result = await getPool().query(`SELECT p.id,p.state,p.version,
        CASE WHEN rc.account_id=$1 OR dc.account_id=$1 THEN true ELSE false END AS is_participant,
        (p.reviewer_account_id=$1 AND EXISTS(SELECT 1 FROM pair_reviewer_grants g
          WHERE g.account_id=$1 AND g.hospital_id=rc.hospital_id AND g.service_id=rc.service_id AND g.revoked_at IS NULL)) AS is_reviewer
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE p.state NOT IN ('declined','withdrawn') AND rc.status='active' AND dc.status='active'
        AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused')
        AND (rc.account_id=$1 OR dc.account_id=$1 OR p.reviewer_account_id=$1)
      ORDER BY p.updated_at DESC,p.id DESC LIMIT 1`, [requireAccount(req).id]);
    if (!result.rowCount || !(result.rows[0].is_participant || result.rows[0].is_reviewer)) return fail(res, 404, 'not_found', 'Current pair not found');
    const { id, state, version } = result.rows[0];
    return ok(res, { id, state, version });
  } catch (error) { return next(error); }
});

router.get('/pairs/:id', requireSession, async (req, res, next) => {
  try {
    const result = await getPool().query(`SELECT p.id,p.state,p.version,
        CASE WHEN rc.account_id=$2 THEN 'recipient' WHEN dc.account_id=$2 THEN 'donor' ELSE NULL END AS role,
        (p.reviewer_account_id=$2) AS is_assigned_reviewer,
        EXISTS(SELECT 1 FROM pair_reviewer_grants g
          WHERE g.account_id=$2 AND g.hospital_id=rc.hospital_id AND g.service_id=rc.service_id AND g.revoked_at IS NULL) AS has_reviewer_grant
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE p.id=$1 AND rc.status='active' AND dc.status='active'
        AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused')`, [req.params.id, requireAccount(req).id]);
    if (!result.rowCount) return fail(res, 404, 'not_found', 'Pair not found');
    const pair = result.rows[0];
    if (!pair.role && !(pair.is_assigned_reviewer && pair.has_reviewer_grant)) return fail(res, 403, 'forbidden', 'Pair access denied');
    return ok(res, { id: pair.id, state: pair.state, version: pair.version, role: pair.role });
  } catch (error) { return next(error); }
});

router.post('/pairs/:id/respond', requireSession, requireSameOrigin, async (req, res, next) => {
  let client;
  try {
    client = await getPool().connect();
    const { response, declineReasonCode = null, idempotencyKey, targetVersion } = req.body || {};
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || !Object.keys(req.body).every((key) => PAIR_RESPONSE_FIELDS.has(key)) || !['accept', 'decline'].includes(response) || !isIdempotencyKey(idempotencyKey) || !Number.isInteger(targetVersion) || targetVersion < 1) {
      return fail(res, 422, 'validation_error', 'Invalid pair response');
    }
    await client.query('BEGIN');
    const found = await client.query(`SELECT p.*,re.id AS recipient_episode_id,de.id AS donor_episode_id,
        rc.account_id AS recipient_account_id,dc.account_id AS donor_account_id,
        re.lifecycle AS recipient_lifecycle,de.lifecycle AS donor_lifecycle,
        re.participation AS recipient_participation,de.participation AS donor_participation,
        rc.status AS recipient_case_status,dc.status AS donor_case_status
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE p.id=$1 AND rc.status='active' AND dc.status='active'
        AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused')
        FOR UPDATE OF p,re,de`, [req.params.id]);
    if (!found.rowCount) return rollbackFail(client, res, 404, 'not_found', 'Pair not found');
    const pair = found.rows[0];
    const episodeId = pair.recipient_account_id === requireAccount(req).id
      ? pair.recipient_episode_id
      : pair.donor_account_id === requireAccount(req).id ? pair.donor_episode_id : null;
    if (!episodeId) return rollbackFail(client, res, 403, 'forbidden', 'Pair access denied');
    const ownLifecycle = episodeId === pair.recipient_episode_id ? pair.recipient_lifecycle : pair.donor_lifecycle;
    const ownParticipation = episodeId === pair.recipient_episode_id ? pair.recipient_participation : pair.donor_participation;
    if (ownLifecycle !== 'active' || ownParticipation !== 'active' || pair.recipient_participation !== 'active' || pair.donor_participation !== 'active') {
      return rollbackFail(client, res, 403, 'forbidden', 'Pair progression is unavailable');
    }
    const responseHash = crypto.createHash('sha256').update(JSON.stringify({ response, declineReasonCode: response === 'decline' ? declineReasonCode : null, targetVersion })).digest();
    const prior = await client.query('SELECT response,response_hash FROM pair_responses WHERE pair_id=$1 AND episode_id=$2', [pair.id, episodeId]);
    if (prior.rowCount) {
      if (prior.rows[0].response_hash && !crypto.timingSafeEqual(prior.rows[0].response_hash, responseHash)) return rollbackFail(client, res, 409, 'conflict', 'Response retry conflicts with the original command');
      if (prior.rows[0].response !== response) return rollbackFail(client, res, 409, 'conflict', 'Response is final');
      await client.query('COMMIT');
      return ok(res, { id: pair.id, state: pair.state, version: pair.version, idempotent: true });
    }
    if (pair.state !== 'awaiting_citizen_acceptance' || pair.version !== targetVersion) {
      return rollbackFail(client, res, 409, 'conflict', 'Pair response is stale');
    }
    await client.query(`INSERT INTO pair_responses(pair_id,episode_id,response,decline_reason,idempotency_key,response_hash)
      VALUES($1,$2,$3,$4,$5,$6)`, [pair.id, episodeId, response, response === 'decline' ? declineReasonCode : null, idempotencyKey, responseHash]);
    let state = pair.state;
    if (response === 'decline') state = 'declined';
    else {
      const accepted = await client.query("SELECT count(*)::int AS count FROM pair_responses WHERE pair_id=$1 AND response='accept'", [pair.id]);
      if (accepted.rows[0].count === 2) {
        state = 'awaiting_schedule';
        await client.query(`INSERT INTO conversations(pair_id) VALUES($1)
          ON CONFLICT (pair_id) WHERE pair_id IS NOT NULL DO NOTHING`, [pair.id]);
      }
    }
    const updated = await client.query(`UPDATE pair_proposals SET state=$2,status=$2,version=version+1,updated_at=now()
      WHERE id=$1 RETURNING id,state,version`, [pair.id, state]);
    await notifyPairParticipants(client, pair.id);
    await client.query('COMMIT');
    return ok(res, updated.rows[0], 201);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error instanceof Error && 'code' in error && error.code === '23505') return fail(res, 409, 'conflict', 'Response is final');
    return next(error);
  } finally { if (client) client.release(); }
});

router.get('/pairs/:id/messages', requireSession, async (req, res, next) => {
  try {
    const cursor = parseMessageCursor(req.query.cursor);
    if (!cursor) return fail(res, 422, 'validation_error', 'Invalid message cursor');
    const access = await getPool().query(`SELECT p.state,co.id AS conversation_id,
        (rc.account_id=$2 OR dc.account_id=$2) AND rc.status='active' AND dc.status='active'
          AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused') AS is_participant,
        (p.reviewer_account_id=$2 AND EXISTS(SELECT 1 FROM pair_reviewer_grants g
          WHERE g.account_id=$2 AND g.hospital_id=rc.hospital_id AND g.service_id=rc.service_id AND g.revoked_at IS NULL)) AS is_reviewer
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      LEFT JOIN conversations co ON co.pair_id=p.id WHERE p.id=$1`, [req.params.id, requireAccount(req).id]);
    if (!access.rowCount) return fail(res, 404, 'not_found', 'Pair not found');
    const grant = access.rows[0];
    if (!(grant.is_participant && READABLE_CHAT_STATES.includes(grant.state)) && !grant.is_reviewer) {
      return fail(res, 403, 'forbidden', 'Conversation access denied');
    }
    if (!grant.conversation_id) return ok(res, { items: [], nextCursor: null });
    const [createdAt, messageId] = cursor;
    const limit = boundedLimit(req.query.limit, 100);
    const result = await getPool().query(`SELECT m.id,m.body,m.created_at AS "createdAt",
        CASE WHEN m.sender_account_id=rc.account_id THEN 'recipient' ELSE 'donor' END AS "senderRole"
      FROM messages m JOIN conversations co ON co.id=m.conversation_id
      JOIN pair_proposals p ON p.id=co.pair_id
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE co.id=$1 AND rc.status='active' AND dc.status='active'
        AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused')
        AND NOT EXISTS(SELECT 1 FROM chat_suppressions s WHERE s.message_id=m.id)
        AND ($2::timestamptz IS NULL OR (m.created_at,m.id)>($2::timestamptz,$3::uuid))
      ORDER BY m.created_at,m.id LIMIT $4`, [grant.conversation_id, createdAt, messageId, limit]);
    const last = result.rows.at(-1);
    return ok(res, { items: result.rows, nextCursor: result.rows.length === limit && last ? `${new Date(last.createdAt).toISOString()}|${last.id}` : null });
  } catch (error) { return next(error); }
});

router.post('/pairs/:id/messages', requireSession, requireSameOrigin, async (req, res, next) => {
  let client;
  try {
    client = await getPool().connect();
    const rawBody = typeof req.body?.body === 'string' ? req.body.body.normalize('NFKC').trim() : '';
    if (!rawBody || isObviousContact(rawBody)) return fail(res, 422, 'validation_error', 'Message cannot be stored');
    const body = sanitizeMessageBody(rawBody);
    const idempotencyKey = req.body?.idempotencyKey;
    if (!body || !isIdempotencyKey(idempotencyKey) || !req.body || Object.keys(req.body).some((key) => !['body', 'idempotencyKey'].includes(key))) return fail(res, 422, 'validation_error', 'Message cannot be stored');
    await client.query('BEGIN');
    const access = await client.query(`SELECT co.id AS conversation_id,
        CASE WHEN rc.account_id=$2 THEN 'recipient' WHEN dc.account_id=$2 THEN 'donor' END AS sender_role
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      JOIN conversations co ON co.pair_id=p.id
      WHERE p.id=$1 AND p.state IN('awaiting_schedule','awaiting_consent')
        AND re.lifecycle='active' AND de.lifecycle='active' AND rc.status='active' AND dc.status='active'
        AND co.closed_at IS NULL AND (rc.account_id=$2 OR dc.account_id=$2)
      FOR UPDATE OF p,re,de,co`, [req.params.id, requireAccount(req).id]);
    if (!access.rowCount) return rollbackFail(client, res, 403, 'forbidden', 'Chat unavailable');
    const responseHash = crypto.createHash('sha256').update(JSON.stringify({ body })).digest();
    const prior = await client.query('SELECT id,body,created_at AS "createdAt",request_hash FROM messages WHERE sender_account_id=$1 AND idempotency_key=$2 FOR UPDATE', [requireAccount(req).id, idempotencyKey]);
    if (prior.rowCount) {
      if (prior.rows[0].request_hash && !crypto.timingSafeEqual(prior.rows[0].request_hash, responseHash)) return rollbackFail(client, res, 409, 'conflict', 'Message retry conflicts with the original command');
      await client.query('COMMIT'); return ok(res, { ...prior.rows[0], senderRole: access.rows[0].sender_role, idempotent: true });
    }
    const message = await client.query(`INSERT INTO messages(conversation_id,sender_account_id,body,idempotency_key,request_hash)
      VALUES($1,$2,$3,$4,$5) RETURNING id,body,created_at AS "createdAt"`,
    [access.rows[0].conversation_id, requireAccount(req).id, body, idempotencyKey, responseHash]);
    await client.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,idempotency_reference,details) VALUES($1,'pair_message_sent',$2,'synthetic-pair',$3,$4)`, [requireAccount(req).id, req.params.id, idempotencyKey, JSON.stringify({ length: body.length })]);
    await client.query('COMMIT');
    return ok(res, { ...message.rows[0], senderRole: access.rows[0].sender_role }, 201);
  } catch (error) { if (client) await client.query('ROLLBACK').catch(() => {}); return next(error); }
  finally { if (client) client.release(); }
});

router.post('/pairs/:id/messages/close', requireSession, requireSameOrigin, async (req, res, next) => {
  let client;
  try {
    const expectedVersion = req.body?.expectedVersion;
    if (!Number.isInteger(expectedVersion)) return fail(res, 422, 'validation_error', 'Pair version is required');
    client = await getPool().connect(); await client.query('BEGIN');
    const closed = await client.query(`UPDATE conversations co SET closed_at=COALESCE(co.closed_at,now()),closed_by=COALESCE(co.closed_by,$2)
      FROM pair_proposals p JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE co.pair_id=p.id AND p.id=$1 AND p.version=$3 AND p.reviewer_account_id=$2
        AND re.lifecycle='active' AND de.lifecycle='active' AND rc.status='active' AND dc.status='active'
        AND EXISTS(SELECT 1 FROM pair_reviewer_grants g WHERE g.account_id=$2
          AND g.hospital_id=rc.hospital_id AND g.service_id=rc.service_id AND g.revoked_at IS NULL)
      RETURNING co.id,co.closed_at AS "closedAt"`, [req.params.id, requireAccount(req).id, expectedVersion]);
    if (!closed.rowCount) return rollbackFail(client, res, 409, 'conflict', 'Conversation cannot be closed');
    await client.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES($1,'pair_conversation_closed',$2,'synthetic-pair',$3)`, [requireAccount(req).id, req.params.id, JSON.stringify({ expectedVersion })]);
    await client.query('COMMIT');
    return ok(res, closed.rows[0]);
  } catch (error) { if (client) await client.query('ROLLBACK').catch(() => {}); return next(error); }
  finally { if (client) client.release(); }
});

router.post('/pairs/:id/messages/:messageId/suppress', requireSession, requireSameOrigin, requireRole('supervisor'), async (req, res, next) => {
  let client;
  try {
    client = await getPool().connect();
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) return fail(res, 422, 'validation_error', 'Suppression reason is required');
    await client.query('BEGIN');
    const message = await client.query(`SELECT m.id,co.id AS conversation_id
      FROM messages m JOIN conversations co ON co.id=m.conversation_id
      JOIN pair_proposals p ON p.id=co.pair_id
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      JOIN services svc ON svc.id=rc.service_id
      WHERE p.id=$1 AND m.id=$2 AND rc.hospital_id=$3 AND svc.code=ANY($4::text[])
      AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused') AND rc.status='active' AND dc.status='active'
      FOR UPDATE OF m,co`, [req.params.id, req.params.messageId, requireAccount(req).hospitalId, requireAccount(req).serviceScope || []]);
    if (!message.rowCount) return rollbackFail(client, res, 403, 'forbidden', 'Suppression access denied');
    const event = await client.query(`INSERT INTO chat_suppressions(message_id,actor_account_id,reason)
      VALUES($1,$2,$3) RETURNING id,created_at AS "createdAt"`, [req.params.messageId, requireAccount(req).id, reason]);
    await client.query('UPDATE conversations SET closed_at=COALESCE(closed_at,now()),closed_by=COALESCE(closed_by,$2) WHERE id=$1',
      [message.rows[0].conversation_id, requireAccount(req).id]);
    await client.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES($1,'pair_message_suppressed',$2,'synthetic-pair',$3)`, [requireAccount(req).id, req.params.messageId, JSON.stringify({ reason })]);
    await client.query('COMMIT');
    return ok(res, event.rows[0], 201);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return next(error);
  } finally { if (client) client.release(); }
});

router.post('/pairs/:id/schedule-proposals', requireSession, requireSameOrigin, async (req, res, next) => {
  let client;
  try {
    client = await getPool().connect();
    const { startsAt, endsAt, location, slotReference = null, source = 'manual', supersedesId = null, targetVersion } = req.body || {};
    const start = new Date(startsAt); const end = new Date(endsAt);
    if (!Number.isInteger(targetVersion) || !location || !slotReference || !source || !isOffsetIsoInstant(startsAt) || !isOffsetIsoInstant(endsAt) || Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || end <= start) {
      return fail(res, 422, 'validation_error', 'Invalid schedule proposal');
    }
    await client.query('BEGIN');
    const pairResult = await client.query(`SELECT p.*,rc.hospital_id,rc.service_id
      FROM pair_proposals p JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE p.id=$1 AND re.lifecycle='active' AND de.lifecycle='active' AND re.participation='active' AND de.participation='active' AND rc.status='active' AND dc.status='active'
      FOR UPDATE OF p,re,de`, [req.params.id]);
    if (!pairResult.rowCount) return rollbackFail(client, res, 404, 'not_found', 'Pair not found');
    const pair = pairResult.rows[0];
    const grant = await client.query(`SELECT 1 FROM pair_reviewer_grants WHERE account_id=$1
      AND hospital_id=$2 AND service_id=$3 AND revoked_at IS NULL`, [requireAccount(req).id, pair.hospital_id, pair.service_id]);
    if (pair.reviewer_account_id !== requireAccount(req).id || !grant.rowCount) return rollbackFail(client, res, 403, 'forbidden', 'Schedule access denied');
    if (pair.state !== 'awaiting_schedule' || pair.version !== targetVersion) return rollbackFail(client, res, 409, 'conflict', 'Schedule is no longer current');
    const active = await client.query("SELECT id FROM schedule_proposals WHERE pair_id=$1 AND state='active' FOR UPDATE", [pair.id]);
    if (active.rowCount) {
      if (!supersedesId || active.rows[0].id !== supersedesId) return rollbackFail(client, res, 409, 'conflict', 'Active proposal must be explicitly superseded');
      await client.query("UPDATE schedule_proposals SET state='superseded' WHERE id=$1", [supersedesId]);
    } else if (supersedesId) return rollbackFail(client, res, 409, 'conflict', 'Superseded proposal is not active');
    const proposal = await client.query(`INSERT INTO schedule_proposals(
        pair_id,starts_at,ends_at,location,slot_reference,source,author_account_id,supersedes_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id,starts_at AS "startsAt",ends_at AS "endsAt",timezone,location,
        slot_reference AS "slotReference",version,state`,
    [pair.id, start, end, location, slotReference, source, requireAccount(req).id, supersedesId]);
    const updated = await client.query('UPDATE pair_proposals SET version=version+1,updated_at=now() WHERE id=$1 RETURNING version', [pair.id]);
    await notifyPairParticipants(client, pair.id);
    await client.query('COMMIT');
    return ok(res, { ...proposal.rows[0], pairVersion: updated.rows[0].version }, 201);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error instanceof Error && 'code' in error && error.code === '23505') return fail(res, 409, 'conflict', 'An active schedule proposal already exists');
    return next(error);
  } finally { if (client) client.release(); }
});

router.get('/pairs/:id/schedule-proposals', requireSession, async (req, res, next) => {
  try {
    const access = await getPool().query(`SELECT
        (rc.account_id=$2 OR dc.account_id=$2) AS is_participant,
        (p.reviewer_account_id=$2 AND EXISTS(SELECT 1 FROM pair_reviewer_grants g
          WHERE g.account_id=$2 AND g.hospital_id=rc.hospital_id AND g.service_id=rc.service_id AND g.revoked_at IS NULL)) AS is_reviewer
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE p.id=$1 AND rc.status='active' AND dc.status='active'
        AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused')`, [req.params.id, requireAccount(req).id]);
    if (!access.rowCount) return fail(res, 404, 'not_found', 'Pair not found');
    if (!access.rows[0].is_participant && !access.rows[0].is_reviewer) return fail(res, 403, 'forbidden', 'Schedule access denied');
    const proposals = await getPool().query(`SELECT id,starts_at AS "startsAt",ends_at AS "endsAt",
        timezone,location,slot_reference AS "slotReference",version,state,supersedes_id AS "supersedesId"
      FROM schedule_proposals WHERE pair_id=$1 ORDER BY created_at,id`, [req.params.id]);
    return ok(res, { items: proposals.rows });
  } catch (error) { return next(error); }
});

router.post('/pairs/:id/schedule-proposals/:proposalId/respond', requireSession, requireSameOrigin, async (req, res, next) => {
  let client;
  try {
    client = await getPool().connect();
    const { response, declineReasonCode = null, idempotencyKey, targetVersion } = req.body || {};
    if (!['confirm', 'decline'].includes(response) || !isIdempotencyKey(idempotencyKey) || !Number.isInteger(targetVersion)) {
      return fail(res, 422, 'validation_error', 'Invalid schedule response');
    }
    await client.query('BEGIN');
    const found = await client.query(`SELECT s.id AS proposal_id,s.state AS proposal_state,s.version AS proposal_version,
        p.id AS pair_id,p.state AS pair_state,p.version AS pair_version,
        re.id AS recipient_episode_id,de.id AS donor_episode_id,
        rc.account_id AS recipient_account_id,dc.account_id AS donor_account_id,
        re.lifecycle AS recipient_lifecycle,de.lifecycle AS donor_lifecycle,
        re.participation AS recipient_participation,de.participation AS donor_participation
      FROM schedule_proposals s JOIN pair_proposals p ON p.id=s.pair_id
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE s.id=$1 AND p.id=$2 AND rc.status='active' AND dc.status='active'
        AND re.lifecycle NOT IN ('suspended','paused') AND de.lifecycle NOT IN ('suspended','paused')
        FOR UPDATE OF s,p,re,de`, [req.params.proposalId, req.params.id]);
    if (!found.rowCount) return rollbackFail(client, res, 404, 'not_found', 'Schedule proposal not found');
    const item = found.rows[0];
    const episodeId = item.recipient_account_id === requireAccount(req).id
      ? item.recipient_episode_id
      : item.donor_account_id === requireAccount(req).id ? item.donor_episode_id : null;
    if (!episodeId) return rollbackFail(client, res, 403, 'forbidden', 'Schedule access denied');
    if (item.recipient_lifecycle !== 'active' || item.donor_lifecycle !== 'active' || item.recipient_participation !== 'active' || item.donor_participation !== 'active') return rollbackFail(client, res, 403, 'forbidden', 'Schedule progression is unavailable');
    const prior = await client.query('SELECT response FROM schedule_responses WHERE proposal_id=$1 AND episode_id=$2', [item.proposal_id, episodeId]);
    if (prior.rowCount) {
      if (prior.rows[0].response !== response) return rollbackFail(client, res, 409, 'conflict', 'Response is final');
      await client.query('COMMIT');
      return ok(res, { id: item.pair_id, state: item.pair_state, version: item.pair_version, idempotent: true });
    }
    if (item.proposal_state !== 'active' || item.pair_state !== 'awaiting_schedule' || item.proposal_version !== targetVersion) {
      return rollbackFail(client, res, 409, 'conflict', 'Schedule response is stale');
    }
    await client.query(`INSERT INTO schedule_responses(proposal_id,episode_id,response,decline_reason,idempotency_key)
      VALUES($1,$2,$3,$4,$5)`, [item.proposal_id, episodeId, response, response === 'decline' ? declineReasonCode : null, idempotencyKey]);
    let state = 'awaiting_schedule';
    if (response === 'decline') await client.query("UPDATE schedule_proposals SET state='declined' WHERE id=$1", [item.proposal_id]);
    else {
      const confirmed = await client.query("SELECT count(*)::int AS count FROM schedule_responses WHERE proposal_id=$1 AND response='confirm'", [item.proposal_id]);
      if (confirmed.rows[0].count === 2) {
        state = 'awaiting_consent';
        await client.query("UPDATE schedule_proposals SET state='accepted' WHERE id=$1", [item.proposal_id]);
      }
    }
    const updated = await client.query(`UPDATE pair_proposals SET state=$2,status=$2,version=version+1,updated_at=now()
      WHERE id=$1 RETURNING id,state,version`, [item.pair_id, state]);
    await notifyPairParticipants(client, item.pair_id);
    await client.query('COMMIT');
    return ok(res, updated.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error instanceof Error && 'code' in error && error.code === '23505') return fail(res, 409, 'conflict', 'Response is final');
    return next(error);
  } finally { if (client) client.release(); }
});

router.get('/pairs/:id/consent', requireSession, async (req, res, next) => {
  try {
    const access = await getPool().query(`SELECT p.id,
        (rc.account_id=$2 OR dc.account_id=$2) AS is_participant,
        (p.reviewer_account_id=$2 OR EXISTS (SELECT 1 FROM pair_reviewer_grants g WHERE g.account_id=$2 AND g.hospital_id=rc.hospital_id AND g.service_id=rc.service_id AND g.revoked_at IS NULL)) AS is_reviewer
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE p.id=$1`, [req.params.id, requireAccount(req).id]);
    if (!access.rowCount) return fail(res, 404, 'not_found', 'Pair not found');
    if (!access.rows[0].is_participant && !access.rows[0].is_reviewer) return fail(res, 403, 'forbidden', 'Access denied');
    const consents = await getPool().query(`SELECT id, consent_version AS "consentVersion", action, created_at AS "createdAt" FROM pair_consents WHERE pair_id=$1 ORDER BY created_at`, [req.params.id]);
    return ok(res, { items: consents.rows });
  } catch (error) { return next(error); }
});

router.post('/pairs/:id/consent', requireSession, requireSameOrigin, async (req, res, next) => {
  let client;
  try {
    client = await getPool().connect();
    const { action = 'grant', consentVersion = 'v1.0', idempotencyKey, targetVersion } = req.body || {};
    if (!['grant', 'decline'].includes(action) || !isIdempotencyKey(idempotencyKey) || !Number.isInteger(targetVersion)) {
      return fail(res, 422, 'validation_error', 'Invalid consent request');
    }
    await client.query('BEGIN');
    const access = await client.query(`SELECT p.id, p.state, p.version,
        re.id AS recipient_episode_id, de.id AS donor_episode_id,
        rc.account_id AS recipient_account_id, dc.account_id AS donor_account_id,
        re.lifecycle AS recipient_lifecycle, de.lifecycle AS donor_lifecycle,
        re.participation AS recipient_participation, de.participation AS donor_participation
      FROM pair_proposals p
      JOIN episodes re ON re.id=p.own_episode_id JOIN citizen_cases rc ON rc.id=re.case_id
      JOIN episodes de ON de.id=p.counterpart_episode_id JOIN citizen_cases dc ON dc.id=de.case_id
      WHERE p.id=$1 AND rc.status='active' AND dc.status='active'
      FOR UPDATE OF p, re, de`, [req.params.id]);
    if (!access.rowCount) return rollbackFail(client, res, 404, 'not_found', 'Pair not found');
    const row = access.rows[0];
    const episodeId = row.recipient_account_id === requireAccount(req).id
      ? row.recipient_episode_id
      : row.donor_account_id === requireAccount(req).id ? row.donor_episode_id : null;
    if (!episodeId) return rollbackFail(client, res, 403, 'forbidden', 'Participant access required');
    if (row.recipient_lifecycle !== 'active' || row.donor_lifecycle !== 'active' || row.recipient_participation !== 'active' || row.donor_participation !== 'active') {
      return rollbackFail(client, res, 403, 'forbidden', 'Participation is not active');
    }
    const prior = await client.query('SELECT action, idempotency_key FROM pair_consents WHERE pair_id=$1 AND episode_id=$2 AND consent_version=$3', [row.id, episodeId, consentVersion]);
    if (prior.rowCount) {
      if (prior.rows[0].idempotency_key === idempotencyKey) {
        await client.query('COMMIT');
        return ok(res, { id: row.id, state: row.state, version: row.version, idempotent: true });
      }
      return rollbackFail(client, res, 409, 'conflict', 'Consent was already submitted');
    }
    if (row.state !== 'awaiting_consent') {
      return rollbackFail(client, res, 409, 'conflict', 'Consent is unavailable until schedule is confirmed');
    }
    if (row.version !== targetVersion) {
      return rollbackFail(client, res, 409, 'conflict', 'Consent submission is stale');
    }

    if (action === 'decline') {
      await client.query(`UPDATE pair_proposals SET state='declined', status='declined', version=version+1, updated_at=now() WHERE id=$1`, [row.id]);
      await client.query(`UPDATE conversations SET closed_at=COALESCE(closed_at,now()), closed_by=COALESCE(closed_by,$2) WHERE pair_id=$1`, [row.id, requireAccount(req).id]);
      await client.query(`INSERT INTO audit_events(actor_account_id, action, target_reference, source, details) VALUES ($1, 'pair_consent_declined', $2, 'coordination', $3)`, [requireAccount(req).id, row.id, JSON.stringify({ consentVersion })]);
      await client.query('COMMIT');
      return ok(res, { id: row.id, state: 'declined', version: row.version + 1 });
    }

    const consentHash = crypto.createHash('sha256').update(JSON.stringify({ pairId: row.id, episodeId, accountId: requireAccount(req).id, consentVersion, action, at: new Date().toISOString() })).digest('hex');
    await client.query(`INSERT INTO pair_consents(pair_id, episode_id, actor_account_id, consent_version, consent_hash, action, idempotency_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [row.id, episodeId, requireAccount(req).id, consentVersion, consentHash, action, idempotencyKey]);
    await client.query(`INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
      VALUES ($1, 'pair_consent_granted', $2, 'coordination', $3)`, [requireAccount(req).id, row.id, JSON.stringify({ consentVersion, consentHash })]);

    const countRes = await client.query(`SELECT count(*)::int AS count FROM pair_consents WHERE pair_id=$1 AND consent_version=$2 AND action='grant'`, [row.id, consentVersion]);
    const consentCount = countRes.rows[0].count;

    if (consentCount >= 2) {
      const simulatedTx = '0x' + crypto.randomBytes(32).toString('hex');
      const simulatedBlockHash = '0x' + crypto.randomBytes(32).toString('hex');
      const updated = await client.query(`UPDATE pair_proposals
        SET state='coordination_complete', status='coordination_complete', version=version+1,
            simulated_anchor_tx=$2, simulated_anchor_hash=$3, anchor_status='simulated_complete', updated_at=now()
        WHERE id=$1 RETURNING id, state, version, simulated_anchor_tx AS "simulatedAnchorTx", anchor_status AS "anchorStatus"`,
        [row.id, simulatedTx, simulatedBlockHash]);
      await client.query(`UPDATE conversations SET closed_at=COALESCE(closed_at,now()), closed_by=COALESCE(closed_by,$2) WHERE pair_id=$1`, [row.id, requireAccount(req).id]);
      await client.query(`INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES ($1, 'pair_coordination_completed', $2, 'coordination', $3)`,
        [requireAccount(req).id, row.id, JSON.stringify({ message: 'Coordination complete — clinical clearance still required', consentVersion })]);
      await notifyPairParticipants(client, row.id);
      await client.query('COMMIT');
      return ok(res, { ...updated.rows[0], consentCount: 2, message: 'Coordination complete — clinical clearance still required' }, 201);
    } else {
      const updated = await client.query(`UPDATE pair_proposals SET version=version+1, updated_at=now() WHERE id=$1 RETURNING id, state, version`, [row.id]);
      await client.query('COMMIT');
      return ok(res, { ...updated.rows[0], consentCount: 1 }, 201);
    }
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error instanceof Error && 'code' in error && error.code === '23505') return fail(res, 409, 'conflict', 'Consent already submitted');
    return next(error);
  } finally {
    if (client) client.release();
  }
});

(router as typeof router & { _contract: Record<string, unknown> })._contract = { boundedLimit, isIdempotencyKey, isObviousContact, isOffsetIsoInstant, parseCandidateCursor, parseMessageCursor };
export default router;
