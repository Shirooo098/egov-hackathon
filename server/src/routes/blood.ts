import express from 'express';
import crypto from 'node:crypto';
import { getPool } from '../db/pool.js';
import { requireRole, requireSession } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';

const router = express.Router();
const staff = [requireSession, requireRole('blood_approver')];
const transitions: Record<string, [string, string]> = { approve: ['draft', 'approved'], publish: ['approved', 'published'], close: ['published', 'closed'] };
const fail = (res: express.Response, status: number, error: string, message: string) => res.status(status).json({ success: false, error, message });
const safe = (r: any) => ({ id: r.id, publicText: r.public_text, status: r.status, publishedAt: r.published_at, createdAt: r.created_at, version: r.version });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get('/', async (_req, res, next) => { try { const q = await getPool().query(`SELECT id,public_text,status,published_at,created_at,version FROM blood_requests WHERE status='published' ORDER BY published_at DESC,created_at DESC`); return res.json({ success: true, data: q.rows.map(safe) }); } catch (e) { return next(e); } });

router.post('/', requireSameOrigin, ...staff, async (req, res, next) => {
  try { const { publicText, hospitalId, serviceId } = req.body ?? {}; if (typeof publicText !== 'string' || !publicText.trim() || publicText.length > 2000 || !UUID.test(hospitalId || '') || !UUID.test(serviceId || '')) return fail(res, 422, 'validation_error', 'Public text, hospital, and blood service are required');
    const actor = req.account!; const c = await getPool().connect();
    try {
      await c.query('BEGIN');
      const q = await c.query(`INSERT INTO blood_requests(hospital_id,service_id,public_text,creator_id,source)
        SELECT s.hospital_id,s.id,$1,a.id,'staff' FROM services s JOIN accounts a ON a.id=$2
        WHERE s.id=$3 AND s.hospital_id=$4 AND s.code='blood' AND a.status='active'
          AND a.role='blood_approver' AND a.hospital_id=s.hospital_id AND 'blood'=ANY(a.service_scope::text[])
        RETURNING id,public_text,status,version,created_at`, [publicText.trim(), actor.id, serviceId, hospitalId]);
      if (!q.rowCount) { await c.query('ROLLBACK'); return fail(res, 404, 'not_found', 'Blood service not found'); }
      await c.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details)
        VALUES($1,'blood_request_created',$2,'blood',$3)`, [actor.id, q.rows[0].id, JSON.stringify({ version: 1 })]);
      await c.query('COMMIT');
      return res.status(201).json({ success: true, data: q.rows[0] });
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  } catch (e) { return next(e); }
});

for (const [action, [from, to]] of Object.entries(transitions)) router.post('/:id/' + action, requireSameOrigin, ...staff, async (req, res, next) => {
  try { const expected = req.body?.expectedVersion; const a = req.account!; const approvalReference = action === 'approve' && typeof req.body?.approvalReference === 'string' ? req.body.approvalReference.trim() : null; if (!Number.isInteger(expected) || expected < 1 || (action === 'approve' && (!approvalReference || approvalReference.length > 320))) return fail(res, 422, 'validation_error', 'expectedVersion and approval evidence are required');
    const column = action === 'approve' ? 'approver_id=$2,approved_at=now()' : action === 'publish' ? 'publisher_id=$2,published_at=now()' : 'closer_id=$2,closed_at=now()';
    const c = await getPool().connect();
    try { await c.query('BEGIN'); const q = await c.query(`UPDATE blood_requests br SET status=$1,${column},approval_reference=CASE WHEN $7::text IS NULL THEN approval_reference ELSE $7 END,version=version+1,updated_at=now() WHERE br.id=$3 AND br.status=$4 AND br.version=$5 AND br.hospital_id=$6 AND EXISTS (SELECT 1 FROM accounts a WHERE a.id=$2 AND a.status='active' AND a.role='blood_approver' AND a.hospital_id=br.hospital_id AND 'blood'=ANY(a.service_scope::text[])) RETURNING id,public_text,status,version,created_at,approved_at,published_at,closed_at`, [to, a.id, req.params.id, from, expected, a.hospitalId, approvalReference]);
      if (!q.rowCount) { await c.query('ROLLBACK'); return fail(res, 409, 'conflict', 'Request is unavailable or version has changed'); }
      await c.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES($1,$2,$3,'blood',$4)`, [a.id, `blood_request_${action}`, req.params.id, JSON.stringify({ from, to, version: expected + 1, ...(approvalReference ? { approvalReference } : {}) })]); await c.query('COMMIT'); return res.json({ success: true, data: q.rows[0] });
    } catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; } finally { c.release(); }
  } catch (e) { return next(e); }
});

router.post('/:id/responses', requireSameOrigin, requireSession, async (req, res, next) => {
  try { const a = req.account!; if (a.role !== 'citizen') return fail(res, 403, 'forbidden', 'Citizen access required'); const key = typeof req.body?.idempotencyKey === 'string' ? req.body.idempotencyKey.trim() : ''; const episode = typeof req.body?.donorEpisodeId === 'string' ? req.body.donorEpisodeId : ''; if (!key || key.length > 200 || !episode) return fail(res, 422, 'validation_error', 'Donor episode and idempotency key are required');
    const hash = crypto.createHash('sha256').update(JSON.stringify({ bloodRequestId: req.params.id, donorEpisodeId: episode })).digest(); const c = await getPool().connect();
    try { await c.query('BEGIN'); await c.query(`SELECT pg_advisory_xact_lock(hashtextextended($1::text || ':' || $2::text, 0))`, [a.id, key]); const prior = await c.query('SELECT id,response_hash,response_status,version FROM blood_responses WHERE actor_account_id=$1 AND idempotency_key=$2 FOR UPDATE', [a.id, key]); if (prior.rowCount) { if (!crypto.timingSafeEqual(Buffer.from(prior.rows[0].response_hash), hash)) { await c.query('ROLLBACK'); return fail(res, 409, 'idempotency_conflict', 'Idempotency key was already used'); } await c.query('COMMIT'); return res.json({ success: true, data: prior.rows[0] }); }
      const q = await c.query(`INSERT INTO blood_responses(blood_request_id,donor_episode_id,actor_account_id,idempotency_key,response_hash) SELECT br.id,$1,$2,$3,$4 FROM blood_requests br JOIN episodes e ON e.id=$1 JOIN citizen_cases cc ON cc.id=e.case_id JOIN services s ON s.id=cc.service_id JOIN donor_intakes di ON di.episode_id=e.id WHERE br.id=$5 AND br.status='published' AND cc.account_id=$2 AND cc.status='active' AND cc.role='donor' AND s.code='blood' AND di.blood_donor=true AND di.state='active' AND e.participation='active' AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE hl.episode_id=e.id AND hl.state='suspended') RETURNING id,blood_request_id AS "bloodRequestId",donor_episode_id AS "donorEpisodeId",response_status AS "responseStatus",version,created_at AS "createdAt"`, [episode, a.id, key, hash, req.params.id]); if (!q.rowCount) { await c.query('ROLLBACK'); return fail(res, 404, 'not_found', 'Published request or owned active donor episode not found'); } await c.query(`INSERT INTO audit_events(actor_account_id,action,target_reference,source,idempotency_reference) VALUES($1,'blood_response_submitted',$2,'blood',$3)`, [a.id, q.rows[0].id, key]); await c.query('COMMIT'); return res.status(201).json({ success: true, data: q.rows[0] });
    } catch (e: unknown) { await c.query('ROLLBACK').catch(() => {}); if (e instanceof Error && 'code' in e && e.code === '23505') return fail(res, 409, 'conflict', 'A response already exists for this request and donor episode'); throw e; } finally { c.release(); }
  } catch (e) { return next(e); }
});
export default router;
