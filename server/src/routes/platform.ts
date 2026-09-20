import express, { type Request, type Response } from 'express';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import { getDb, withTransaction } from '../db/client.js';
import { requireSession, requireRole } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import type { Account } from '../auth/service.js';
import type { RuntimeMode } from '../runtime/config.js';
import { maskPhoneNumber } from '../services/eMessageService.js';
import { GENERIC_NOTIFICATION_TEMPLATES, runNotificationBatch } from '../services/notificationService.js';
import { requireWorkflowActive } from './operations.js';
import { consentCommitment } from '../services/EgovChainService.js';
import { caseConsentScope, latestConsentState, CONSENT_VERSION, CONSENT_PURPOSES } from '../services/ConsentPolicy.js';

const router = express.Router();
router.use(requireSession);
type PlatformRequest = Request & { platformLiveMode?: boolean };
const db = () => getDb();
const json = (res: Response, data: unknown, status = 200) => res.status(status).json({ success: true, data });
const fail = (res: Response, status: number, message: string, code = message.toLowerCase().replace(/\s+/g, '_')) => res.status(status).json({ success: false, error: code, message });
const requireAccount = (req: Request): Account => {
  if (!req.account) throw new Error('Authentication required');
  return req.account;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;
const APPOINTMENT_FIELDS = new Set(['episodeId', 'slotReference', 'preferredDates', 'idempotencyKey']);
const MESSAGE_FIELDS = new Set(['body', 'idempotencyKey']);
const ASSIGNMENT_FIELDS = new Set(['episodeId', 'primaryStaffId', 'coverageStaffId', 'serviceId', 'version']);
const CONTACT_TOKEN = /(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|https?:\/\/\S+|www\.\S+|\+?\d[\d\s().-]{7,}\d|(?:^|\s)@[A-Za-z0-9_.]{2,})/gi;
const sqlTextArray = (arr: string[] = []) =>
  arr && arr.length > 0
    ? sql`ARRAY[${sql.join(arr.map((item) => sql`${item}`), sql`, `)}]::text[]`
    : sql`ARRAY[]::text[]`;
const latestAssignment = (account: Account) => sql`EXISTS (SELECT 1 FROM staff_assignments sa WHERE sa.episode_id=e.id AND sa.service_id=c.service_id AND ${account.id}=ANY(ARRAY[sa.primary_staff_id,sa.coverage_staff_id]) AND NOT EXISTS (SELECT 1 FROM staff_assignments newer WHERE newer.episode_id=sa.episode_id AND (newer.updated_at>sa.updated_at OR (newer.updated_at=sa.updated_at AND newer.id>sa.id))))`;
const teamConversationAccess = (account: Account, liveMode: boolean, write = false) => account.role === 'citizen'
  ? sql`c.account_id=${account.id} AND c.status='active' AND (${!liveMode} OR s.code='blood') AND ${write ? sql`e.participation='active'` : sql`true`}`
  : account.role === 'coordinator'
    ? sql`c.status='active' AND (${!liveMode} OR s.code='blood') AND s.hospital_id=${account.hospitalId} AND s.code=ANY(${sqlTextArray(account.serviceScope)}) AND ${latestAssignment(account)} AND ${write ? sql`e.participation='active'` : sql`true`}`
    : sql`false`;
export const sanitizeMessageBody = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.normalize('NFKC').trim();
  if (!normalized || normalized.length > 2000 || /[\u0000-\u001f\u007f-\u009f]/.test(normalized)) return null;
  const redacted = normalized.replace(CONTACT_TOKEN, '[redacted contact]').trim();
  return redacted.length >= 1 && redacted.length <= 2000 ? redacted : null;
};
export const validAppointmentDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const CASE_FIELDS = new Set(['hospitalId', 'serviceId', 'role', 'participationIntent']);
const TERMINAL_EPISODE_LIFECYCLES = new Set(['closed', 'withdrawn']);
export function transitionParticipation(action: string, lifecycle: string, participation: string): string | null {
  if (TERMINAL_EPISODE_LIFECYCLES.has(lifecycle)) return null;
  if (action === 'pause' && participation === 'active') return 'paused';
  if (action === 'resume' && participation === 'paused') return 'active';
  if (action === 'withdraw' && (participation === 'active' || participation === 'paused')) return 'withdrawn';
  return null;
}

router.get('/services', async (_req, res, next) => {
  try {
    const result = await db().execute(sql`SELECT s.id, s.code, s.name, s.hospital_id AS "hospitalId", h.name AS "hospitalName"
      FROM services s JOIN hospitals h ON h.id=s.hospital_id
      WHERE s.code IN ('blood','kidney') AND (${(_req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')
      ORDER BY s.code, s.name, h.name, s.id`);
    return json(res, result.rows);
  } catch (e) { return next(e); }
});

router.get('/cases', async (req, res, next) => {
  try {
    const rows = await db().execute(sql`SELECT c.id, c.hospital_id AS "hospitalId", c.service_id AS "serviceId", c.role, c.participation_intent AS "participationIntent", c.status, c.created_at AS "createdAt", c.updated_at AS "updatedAt",
      latest.id AS "episodeId", latest.lifecycle, latest.participation, latest.version
      FROM citizen_cases c
      LEFT JOIN LATERAL (SELECT e.id, e.lifecycle, e.participation, e.version FROM episodes e WHERE e.case_id=c.id AND e.participation <> 'withdrawn' ORDER BY e.created_at DESC, e.id DESC LIMIT 1) latest ON true
      WHERE c.account_id = ${requireAccount(req).id} AND c.status <> 'withdrawn' AND NOT EXISTS (SELECT 1 FROM hospital_linkages blocked WHERE blocked.case_id=c.id AND blocked.state='suspended') AND (${(req as PlatformRequest).platformLiveMode !== true} OR EXISTS (SELECT 1 FROM services s WHERE s.id=c.service_id AND s.code='blood')) ORDER BY c.created_at DESC`);
    return json(res, rows.rows);
  } catch (e) { return next(e); }
});

router.post('/cases', requireSameOrigin, requireWorkflowActive('intake'), async (req, res, next) => {
  try {
    const body = req.body || {};
    if ((req as PlatformRequest).platformLiveMode === true && (body.requestType === 'organ' || (Array.isArray(body.pledgedOrgans) && body.pledgedOrgans.length > 0))) return fail(res, 404, 'Requested service is disabled', 'service_disabled');
    const { hospitalId = null, serviceId, role, participationIntent = 'evaluation' } = body;
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).every((key) => CASE_FIELDS.has(key)) || !UUID.test(serviceId || '') || (hospitalId !== null && !UUID.test(hospitalId || '')) || !['donor', 'recipient'].includes(role) || !['evaluation', 'blood', 'organ'].includes(participationIntent)) return fail(res, 422, 'Invalid case fields', 'validation_error');
    const liveMode = (req as PlatformRequest).platformLiveMode === true;
    const result = await db().execute(sql`WITH inserted_case AS (
      INSERT INTO citizen_cases(account_id,hospital_id,service_id,role,participation_intent)
      SELECT ${requireAccount(req).id},${hospitalId},${serviceId},${role},${participationIntent}
      WHERE ${!liveMode} OR EXISTS (SELECT 1 FROM services s WHERE s.id=${serviceId} AND s.code='blood')
      ON CONFLICT (account_id,service_id,role) WHERE account_id IS NOT NULL AND status='active' DO NOTHING
      RETURNING *, true AS created
    ), selected_case AS (
      SELECT * FROM inserted_case
      UNION ALL
      SELECT c.*, false AS created FROM citizen_cases c WHERE c.account_id=${requireAccount(req).id} AND c.service_id=${serviceId} AND c.role=${role} AND c.status='active' AND (${!liveMode} OR EXISTS (SELECT 1 FROM services s WHERE s.id=${serviceId} AND s.code='blood')) AND NOT EXISTS (SELECT 1 FROM inserted_case)
      LIMIT 1
    ), new_episode AS (
      INSERT INTO episodes(case_id) SELECT id FROM selected_case WHERE created RETURNING *
    )
      SELECT c.id AS "caseId", e.id AS "episodeId", c.role, c.participation_intent AS "participationIntent", e.lifecycle, e.participation, e.version, c.created
    FROM selected_case c JOIN LATERAL (
      SELECT id,lifecycle,participation,version FROM new_episode
      UNION ALL
      (SELECT id,lifecycle,participation,version FROM episodes WHERE case_id=c.id AND NOT c.created ORDER BY created_at DESC,id DESC LIMIT 1)
    ) e ON true`);
    let data = result.rows[0];
    if (!data) {
      const retry = await db().execute(sql`SELECT c.id AS "caseId", c.role, c.participation_intent AS "participationIntent", e.id AS "episodeId", e.lifecycle, e.participation, e.version, false AS created
        FROM citizen_cases c JOIN LATERAL (SELECT id,lifecycle,participation,version FROM episodes WHERE case_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) e ON true
        WHERE c.account_id=${requireAccount(req).id} AND c.service_id=${serviceId} AND c.role=${role} AND c.status='active' AND (${!liveMode} OR EXISTS (SELECT 1 FROM services s WHERE s.id=${serviceId} AND s.code='blood'))`);
      data = retry.rows[0];
    }
    if (!data) return fail(res, 409, 'Case creation is unavailable; please retry', 'conflict');
    return json(res, { caseId: data.caseId, episodeId: data.episodeId, role: data.role, participationIntent: data.participationIntent, lifecycle: data.lifecycle, participation: data.participation, version: data.version }, data.created ? 201 : 200);
  } catch (e) { return next(e); }
});

router.post('/episodes', requireSameOrigin, async (req, res, next) => {
  try {
    const { caseId } = req.body || {};
    const result = await db().execute(sql`INSERT INTO episodes(case_id) SELECT c.id FROM citizen_cases c WHERE c.id=${caseId} AND c.account_id=${requireAccount(req).id} AND c.status='active' AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE hl.case_id=c.id AND hl.state='suspended') AND (${(req as PlatformRequest).platformLiveMode !== true} OR EXISTS (SELECT 1 FROM services s WHERE s.id=c.service_id AND s.code='blood')) RETURNING id, case_id AS "caseId", lifecycle, version, created_at AS "createdAt"`);
    if (!result.rowCount) return fail(res, 404, 'Case not found', 'not_found');
    return json(res, result.rows[0], 201);
  } catch (e) { return next(e); }
});

router.post('/cases/:caseId/episodes', requireSameOrigin, requireWorkflowActive('intake'), async (req, res, next) => {
  try {
    const result = await db().execute(sql`INSERT INTO episodes(case_id) SELECT c.id FROM citizen_cases c WHERE c.id=${req.params.caseId} AND c.account_id=${requireAccount(req).id} AND c.status='active' AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE hl.case_id=c.id AND hl.state='suspended') AND (${(req as PlatformRequest).platformLiveMode !== true} OR EXISTS (SELECT 1 FROM services s WHERE s.id=c.service_id AND s.code='blood')) RETURNING id, case_id AS "caseId", lifecycle, version, created_at AS "createdAt"`);
    return result.rowCount ? json(res, result.rows[0], 201) : fail(res, 404, 'Case not found', 'not_found');
  } catch (e) { return next(e); }
});

router.get('/episodes/:id', async (req, res, next) => {
  try {
    const result = await db().execute(sql`SELECT e.id, e.case_id AS "caseId", e.lifecycle, e.participation, e.version, e.created_at AS "createdAt", e.updated_at AS "updatedAt" FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=${req.params.id} AND c.account_id=${requireAccount(req).id} AND NOT EXISTS (SELECT 1 FROM hospital_linkages blocked WHERE blocked.episode_id=e.id AND blocked.state='suspended') AND (${(req as PlatformRequest).platformLiveMode !== true} OR EXISTS (SELECT 1 FROM services s WHERE s.id=c.service_id AND s.code='blood'))`);
    return result.rowCount ? json(res, result.rows[0]) : fail(res, 404, 'Episode not found', 'not_found');
  } catch (e) { return next(e); }
});

const BLOOD_GROUPS = new Set(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const ORGANS = new Set(['kidney', 'liver', 'heart', 'lung', 'pancreas']);
const INTAKE_STATES = new Set(['draft', 'active', 'paused', 'withdrawn']);
const URGENCY = new Set(['routine', 'urgent', 'critical']);
const intakeKeys = {
  recipient: new Set(['requestType', 'declaredBloodGroup', 'requestedOrgan', 'urgency', 'state', 'expectedVersion']),
  donor: new Set(['declaredBloodGroup', 'pledgedOrgans', 'bloodDonor', 'availability', 'state', 'expectedVersion'])
};
const hasOnlyKeys = (body: Record<string, unknown>, allowed: Set<string>) => Object.keys(body).every((key) => allowed.has(key));
const isVersion = (value: unknown) => value === undefined || (typeof value === 'number' && Number.isInteger(value) && value > 0);
const isString = (value: unknown): value is string => typeof value === 'string';

function validateIntake(role: 'recipient' | 'donor', body: Record<string, unknown>): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body) || !hasOnlyKeys(body, intakeKeys[role])) return 'Unknown or invalid intake field';
  if (!isVersion(body.expectedVersion)) return 'expectedVersion must be a positive integer';
  if (role === 'recipient') {
    if (!isString(body.requestType) || !['blood', 'organ'].includes(body.requestType) || !isString(body.declaredBloodGroup) || !BLOOD_GROUPS.has(body.declaredBloodGroup) || !isString(body.urgency) || !URGENCY.has(body.urgency)) return 'Invalid recipient intake';
    if (body.requestType === 'organ' && (!isString(body.requestedOrgan) || !ORGANS.has(body.requestedOrgan))) return 'An organ is required for an organ request';
    if (body.requestType === 'blood' && body.requestedOrgan !== null && body.requestedOrgan !== undefined) return 'Blood requests cannot include an organ';
    if (body.state !== undefined && (!isString(body.state) || !INTAKE_STATES.has(body.state))) return 'Invalid intake state';
  } else {
    if (!isString(body.declaredBloodGroup) || !BLOOD_GROUPS.has(body.declaredBloodGroup) || !Array.isArray(body.pledgedOrgans) || body.pledgedOrgans.some((organ: unknown) => !isString(organ) || !ORGANS.has(organ)) || new Set(body.pledgedOrgans).size !== body.pledgedOrgans.length || typeof body.bloodDonor !== 'boolean' || !isString(body.availability) || !['available', 'unavailable'].includes(body.availability)) return 'Invalid donor intake';
    if (!body.bloodDonor && body.pledgedOrgans.length === 0) return 'A donor must pledge blood or an organ';
    if (body.state !== undefined && (!isString(body.state) || !INTAKE_STATES.has(body.state))) return 'Invalid intake state';
  }
  return null;
}

router.get('/episodes/:id/intake', async (req, res, next) => {
  try {
    const result = await db().execute(sql`SELECT e.id, c.role,
      ri.request_type AS "requestType", ri.declared_blood_group AS "declaredBloodGroup", ri.requested_organ AS "requestedOrgan", ri.urgency, ri.state, ri.version, ri.created_at AS "createdAt", ri.updated_at AS "updatedAt",
      di.declared_blood_group AS "donorDeclaredBloodGroup", di.pledged_organs AS "pledgedOrgans", di.blood_donor AS "bloodDonor", di.availability AS "availability", di.state AS "donorState", di.version AS "donorVersion", di.created_at AS "donorCreatedAt", di.updated_at AS "donorUpdatedAt"
      FROM episodes e JOIN citizen_cases c ON c.id=e.case_id LEFT JOIN recipient_intakes ri ON ri.episode_id=e.id LEFT JOIN donor_intakes di ON di.episode_id=e.id
      WHERE e.id=${req.params.id} AND c.account_id=${requireAccount(req).id} AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE hl.episode_id=e.id AND hl.state='suspended') AND (${(req as PlatformRequest).platformLiveMode !== true} OR EXISTS (SELECT 1 FROM services s WHERE s.id=c.service_id AND s.code='blood'))`);
    if (!result.rowCount) return fail(res, 404, 'Episode not found', 'not_found');
    const row = result.rows[0];
    const data = row.role === 'recipient'
      ? (row.requestType ? { episodeId: row.id, role: row.role, requestType: row.requestType, declaredBloodGroup: row.declaredBloodGroup, requestedOrgan: row.requestedOrgan, urgency: row.urgency, state: row.state, version: row.version, createdAt: row.createdAt, updatedAt: row.updatedAt } : null)
      : (row.pledgedOrgans ? { episodeId: row.id, role: row.role, declaredBloodGroup: row.donorDeclaredBloodGroup, pledgedOrgans: row.pledgedOrgans, bloodDonor: row.bloodDonor, availability: row.availability, state: row.donorState, version: row.donorVersion, createdAt: row.donorCreatedAt, updatedAt: row.donorUpdatedAt } : null);
    return json(res, data);
  } catch (e) { return next(e); }
});

router.put('/episodes/:id/intake', requireSameOrigin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await withTransaction(async (tx) => {
      const owner = await tx.execute(sql`SELECT c.role, e.lifecycle, e.participation FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=${req.params.id} AND c.account_id=${requireAccount(req).id} AND c.role IN ('recipient','donor') AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE hl.episode_id=e.id AND hl.state='suspended') AND (${(req as PlatformRequest).platformLiveMode !== true} OR EXISTS (SELECT 1 FROM services s WHERE s.id=c.service_id AND s.code='blood')) FOR UPDATE OF c, e`);
      if (!owner.rowCount) return { notFound: true };
      if (owner.rows[0].lifecycle === 'closed' || owner.rows[0].participation === 'withdrawn') return { error: 'Historical episode is read-only and cannot be updated' };
      const role = owner.rows[0].role;
    const validationError = validateIntake(role === 'recipient' ? 'recipient' : 'donor', body as Record<string, unknown>);
    if (validationError) return { error: validationError };
    const expected = body.expectedVersion === undefined ? null : body.expectedVersion;
    if (role === 'recipient') {
      const result = await tx.execute(sql`INSERT INTO recipient_intakes (episode_id, request_type, declared_blood_group, requested_organ, urgency, state)
        VALUES (${req.params.id}, ${body.requestType}, ${body.declaredBloodGroup}, ${body.requestedOrgan ?? null}, ${body.urgency}, ${body.state || 'draft'})
        ON CONFLICT (episode_id) DO UPDATE SET request_type=EXCLUDED.request_type, declared_blood_group=EXCLUDED.declared_blood_group, requested_organ=EXCLUDED.requested_organ, urgency=EXCLUDED.urgency, state=EXCLUDED.state,
          version=CASE WHEN ROW(recipient_intakes.request_type,recipient_intakes.declared_blood_group,recipient_intakes.requested_organ,recipient_intakes.urgency,recipient_intakes.state) IS NOT DISTINCT FROM ROW(EXCLUDED.request_type,EXCLUDED.declared_blood_group,EXCLUDED.requested_organ,EXCLUDED.urgency,EXCLUDED.state) THEN recipient_intakes.version ELSE recipient_intakes.version+1 END,
          updated_at=CASE WHEN ROW(recipient_intakes.request_type,recipient_intakes.declared_blood_group,recipient_intakes.requested_organ,recipient_intakes.urgency,recipient_intakes.state) IS NOT DISTINCT FROM ROW(EXCLUDED.request_type,EXCLUDED.declared_blood_group,EXCLUDED.requested_organ,EXCLUDED.urgency,EXCLUDED.state) THEN recipient_intakes.updated_at ELSE now() END
        WHERE ROW(recipient_intakes.request_type,recipient_intakes.declared_blood_group,recipient_intakes.requested_organ,recipient_intakes.urgency,recipient_intakes.state) IS NOT DISTINCT FROM ROW(EXCLUDED.request_type,EXCLUDED.declared_blood_group,EXCLUDED.requested_organ,EXCLUDED.urgency,EXCLUDED.state) OR (${expected}::integer IS NOT NULL AND recipient_intakes.version=${expected}::integer)
        RETURNING episode_id AS "episodeId", request_type AS "requestType", declared_blood_group AS "declaredBloodGroup", requested_organ AS "requestedOrgan", urgency, state, version, created_at AS "createdAt", updated_at AS "updatedAt"`);
      if (!result.rowCount) return { error: 'Intake version is stale' };
      return { role, row: result.rows[0] };
    }
    const result = await tx.execute(sql`INSERT INTO donor_intakes (episode_id, declared_blood_group, pledged_organs, blood_donor, availability, state)
      VALUES (${req.params.id}, ${body.declaredBloodGroup}, ${sql.param(body.pledgedOrgans)}::text[], ${body.bloodDonor}, ${body.availability}, ${body.state || 'draft'})
      ON CONFLICT (episode_id) DO UPDATE SET declared_blood_group=EXCLUDED.declared_blood_group, pledged_organs=EXCLUDED.pledged_organs, blood_donor=EXCLUDED.blood_donor, availability=EXCLUDED.availability, state=EXCLUDED.state,
        version=CASE WHEN ROW(donor_intakes.declared_blood_group,donor_intakes.pledged_organs,donor_intakes.blood_donor,donor_intakes.availability,donor_intakes.state) IS NOT DISTINCT FROM ROW(EXCLUDED.declared_blood_group,EXCLUDED.pledged_organs,EXCLUDED.blood_donor,EXCLUDED.availability,EXCLUDED.state) THEN donor_intakes.version ELSE donor_intakes.version+1 END,
        updated_at=CASE WHEN ROW(donor_intakes.declared_blood_group,donor_intakes.pledged_organs,donor_intakes.blood_donor,donor_intakes.availability,donor_intakes.state) IS NOT DISTINCT FROM ROW(EXCLUDED.declared_blood_group,EXCLUDED.pledged_organs,EXCLUDED.blood_donor,EXCLUDED.availability,EXCLUDED.state) THEN donor_intakes.updated_at ELSE now() END
      WHERE ROW(donor_intakes.declared_blood_group,donor_intakes.pledged_organs,donor_intakes.blood_donor,donor_intakes.availability,donor_intakes.state) IS NOT DISTINCT FROM ROW(EXCLUDED.declared_blood_group,EXCLUDED.pledged_organs,EXCLUDED.blood_donor,EXCLUDED.availability,EXCLUDED.state) OR (${expected}::integer IS NOT NULL AND donor_intakes.version=${expected}::integer)
      RETURNING episode_id AS "episodeId", declared_blood_group AS "declaredBloodGroup", pledged_organs AS "pledgedOrgans", blood_donor AS "bloodDonor", availability, state, version, created_at AS "createdAt", updated_at AS "updatedAt"`);
    if (!result.rowCount) return { error: 'Intake version is stale' };
    return { role, row: result.rows[0] };
    });
    if ('notFound' in result) return fail(res, 404, 'Episode not found', 'not_found');
    if ('error' in result) {
      const message = result.error ?? 'Invalid intake';
      const conflict = message === 'Intake version is stale' || message === 'Historical episode is read-only and cannot be updated';
      return fail(res, conflict ? 409 : 422, message, conflict ? 'conflict' : 'validation_error');
    }
    return json(res, { role: result.role, ...result.row });
  } catch (e) { return next(e); }
});

router.get('/episodes/:id/consent', async (req, res, next) => {
  try {
    if (!UUID.test(String(req.params.id))) return fail(res, 404, 'Episode not found', 'not_found');
    const actor = requireAccount(req);
    const isHospitalStaff = Boolean(
      actor.hospitalId &&
      ['coordinator', 'scheduler', 'doctor', 'clinical_lead', 'hospital_admin', 'supervisor'].includes(actor.role)
    );
    const episode = await db().execute(sql`SELECT c.hospital_id AS "hospitalId" FROM episodes e JOIN citizen_cases c ON c.id=e.case_id
      WHERE e.id=${req.params.id} AND (
        c.account_id=${actor.id} OR (
          ${isHospitalStaff} AND c.hospital_id=${actor.hospitalId}
          AND EXISTS (SELECT 1 FROM accounts staff WHERE staff.id=${actor.id} AND staff.status='active')
          AND EXISTS (SELECT 1 FROM services s WHERE s.id=c.service_id AND s.hospital_id=c.hospital_id AND s.code=ANY(${sqlTextArray(actor.serviceScope)}))
          AND ${latestAssignment(actor)}
        )
      )`);
    if (!episode.rowCount) return fail(res, 404, 'Episode not found', 'not_found');
    const hospitalId = episode.rows[0].hospitalId ? String(episode.rows[0].hospitalId) : null;
    const scope = caseConsentScope(String(req.params.id), hospitalId);
    const result = await db().execute(sql`SELECT ec.id, ec.episode_id AS "episodeId", ec.consent_version AS "version", ec.purpose, ec.scope, ec.commitment, ec.action, ec.anchor_status AS "anchorStatus", ec.anchor_tx_hash AS "txHash", ec.anchor_block_hash AS "blockHash", ec.anchor_block_number AS "blockNumber", ec.created_at AS "createdAt"
      FROM episode_consents ec WHERE ec.episode_id=${req.params.id} ORDER BY ec.created_at DESC,ec.id DESC`);
    const current = latestConsentState(result.rows.filter((row) => (row as any).version === CONSENT_VERSION) as Array<{ purpose: string; action: string; scope: string }>, scope);
    return json(res, {
      requirements: {
        consentVersion: CONSENT_VERSION,
        scope,
        purposes: CONSENT_PURPOSES.map((id) => ({
          id,
          text: id === 'coordination' ? 'Allow coordination of this case.' : 'Allow coordination information sharing for this case.'
        }))
      },
      current,
      events: result.rows
    });
  } catch (e) { return next(e); }
});

router.post('/episodes/:id/consent', requireSameOrigin, async (req, res, next) => {
  try {
    const { action, consentVersion = CONSENT_VERSION, purpose, scope, evidence = '', idempotencyKey } = req.body || {};
    if (!UUID.test(String(req.params.id)) || !['grant', 'withdraw'].includes(action) || !['coordination', 'information_sharing'].includes(purpose) || consentVersion !== CONSENT_VERSION || typeof scope !== 'string' || typeof evidence !== 'string' || evidence.length > 2000 || typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 200) {
      return fail(res, 422, 'Invalid coordination consent request', 'validation_error');
    }
    const actor = requireAccount(req);
    const result = await withTransaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.id}:${idempotencyKey}`}, 0))`);
      const ep = await tx.execute(sql`SELECT e.id, e.lifecycle, e.participation, e.version, c.hospital_id AS "hospitalId"
        FROM episodes e JOIN citizen_cases c ON c.id=e.case_id
        WHERE e.id=${req.params.id} AND c.account_id=${actor.id}
          AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE hl.episode_id=e.id AND hl.state='suspended')
        FOR UPDATE OF e,c`);
      if (!ep.rowCount) return { notFound: true };
      const episode = ep.rows[0];
      const prior = await tx.execute(sql`SELECT id, episode_id AS "episodeId", consent_version AS "consentVersion", purpose, scope, evidence, commitment, action, anchor_status AS "anchorStatus", idempotency_key AS "idempotencyKey", created_at AS "createdAt"
        FROM episode_consents WHERE actor_account_id=${actor.id} AND idempotency_key=${idempotencyKey}`);
      if (prior.rowCount) {
        const previous = prior.rows[0];
        if (String(previous.episodeId) !== String(req.params.id) || previous.action !== action || previous.purpose !== purpose || previous.scope !== scope || previous.evidence !== evidence || previous.consentVersion !== consentVersion) return { conflict: 'Idempotency key payload mismatch' };
        return { row: { ...previous, version: previous.consentVersion, idempotent: true }, replay: true };
      }
      const expectedScope = caseConsentScope(String(req.params.id), episode.hospitalId ? String(episode.hospitalId) : null);
      if (scope !== expectedScope) return { conflict: 'Consent scope is stale' };
      if (episode.lifecycle === 'closed' || episode.participation === 'withdrawn') {
        return { conflict: 'Cannot record consent on closed or withdrawn episode' };
      }
      const { commitment, salt } = consentCommitment({
        targetId: String(req.params.id),
        actorId: actor.id,
        version: consentVersion,
        action: action as 'grant' | 'withdraw',
        purpose: purpose as string,
        scope: scope as string,
        evidence: evidence as string,
        idempotencyKey,
      });
      const inserted = await tx.execute(sql`INSERT INTO episode_consents(episode_id, actor_account_id, consent_version, purpose, scope, evidence, commitment_salt, consent_hash, commitment, action, idempotency_key)
        VALUES (${req.params.id}, ${actor.id}, ${consentVersion}, ${purpose}, ${scope}, ${evidence}, ${salt}, ${commitment}, ${commitment}, ${action}, ${idempotencyKey})
        RETURNING id, episode_id AS "episodeId", consent_version AS "version", purpose, scope, commitment, action, anchor_status AS "anchorStatus", created_at AS "createdAt"`);
      if (!inserted.rowCount) {
        return { conflict: 'Consent for this version is already recorded' };
      }
      await tx.execute(sql`INSERT INTO coordination_updates(target_reference, category, value, source, author_reference, occurred_at)
        VALUES (${req.params.id}, 'coordination_consent', ${JSON.stringify({ action, consentVersion, purpose, scope, commitment })}::jsonb, 'citizen-portal', ${actor.id}, now())`);
      await tx.execute(sql`INSERT INTO consent_anchor_outbox(episode_consent_id, commitment) VALUES (${inserted.rows[0].id}, ${commitment})`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${actor.id}, ${action === 'grant' ? 'coordination_consent_granted' : 'coordination_consent_withdrawn'}, ${req.params.id}, 'coordination', ${JSON.stringify({ consentVersion, purpose, scope, commitment })}::jsonb)`);
      if (action === 'withdraw') {
        await tx.execute(sql`UPDATE pair_proposals SET state='withdrawn', status='withdrawn', version=version+1, updated_at=now() WHERE state NOT IN ('declined','withdrawn') AND (own_episode_id=${req.params.id}::uuid OR counterpart_episode_id=${req.params.id}::uuid)`);
        await tx.execute(sql`UPDATE conversations SET closed_at=COALESCE(closed_at,now()), closed_by=COALESCE(closed_by,${actor.id}::uuid) WHERE (episode_id=${req.params.id}::uuid OR pair_id IN (SELECT id FROM pair_proposals WHERE own_episode_id=${req.params.id}::uuid OR counterpart_episode_id=${req.params.id}::uuid)) AND closed_at IS NULL`);
        await tx.execute(sql`INSERT INTO follow_up_tasks(episode_id,booking_id,cause,assigned_team,conflict_reference)
          SELECT DISTINCT ${req.params.id}::uuid, b.id, 'consent_withdrawn_booking_reconciliation', 'coordination', ${commitment}
          FROM appointment_requests ar JOIN bookings b ON b.request_id=ar.id AND b.status IN ('confirmed','pending')
          WHERE ar.episode_id=${req.params.id}::uuid
            AND NOT EXISTS (SELECT 1 FROM follow_up_tasks f WHERE f.episode_id=${req.params.id}::uuid AND f.booking_id=b.id AND f.cause='consent_withdrawn_booking_reconciliation')`);
      }
      return { row: inserted.rows[0], replay: false };
    });
    if (result.notFound) return fail(res, 404, 'Episode not found', 'not_found');
    if (result.conflict) return fail(res, 409, result.conflict, 'conflict');
    return json(res, result.row, result.replay ? 200 : 201);
  } catch (e) { return next(e); }
});

router.post('/episodes/:id/:action', requireSameOrigin, async (req, res, next) => {
  try {
    const { action } = req.params;
    if (typeof action !== 'string' || !['pause', 'resume', 'withdraw'].includes(action)) return next();
    const expectedVersion = req.body?.version;
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return fail(res, 422, 'Episode version is required', 'validation_error');
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : null;
    // Participation is an independent overlay; pause/resume never rewrite lifecycle facts.
    const result = await withTransaction(async (tx) => {
      await tx.execute(sql`SELECT c.id FROM citizen_cases c JOIN episodes e ON e.case_id=c.id WHERE e.id=${req.params.id} AND c.account_id=${requireAccount(req).id} FOR UPDATE OF c`);
      const updated = await tx.execute(sql`UPDATE episodes e
        SET lifecycle=e.lifecycle,
            participation=CASE WHEN ${action}='withdraw' THEN 'withdrawn' WHEN ${action}='pause' THEN 'paused' ELSE 'active' END,
            pause_reason=CASE WHEN ${action}='pause' THEN ${reason} WHEN ${action}='resume' THEN NULL ELSE e.pause_reason END,
            withdrawal_reason=CASE WHEN ${action}='withdraw' THEN ${reason} ELSE e.withdrawal_reason END,
            version=e.version+1,
            updated_at=now()
        FROM citizen_cases c
        WHERE e.id=${req.params.id} AND c.id=e.case_id AND c.account_id=${requireAccount(req).id}
          AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE hl.episode_id=e.id AND hl.state='suspended')
          AND e.version=${expectedVersion} AND e.lifecycle NOT IN ('closed','withdrawn')
          AND ((${action}='pause' AND e.participation='active') OR (${action}='resume' AND e.participation='paused') OR (${action}='withdraw' AND e.participation IN ('active','paused')))
        RETURNING e.id, e.lifecycle, e.participation, e.version, e.pause_reason AS "pauseReason", e.withdrawal_reason AS "withdrawalReason"`);
      if (!updated.rowCount) return null;
      await tx.execute(sql`INSERT INTO coordination_updates(target_reference, category, value, source, author_reference, occurred_at)
        VALUES (${req.params.id}, 'participation_transition', ${JSON.stringify({ action, reason, priorVersion: expectedVersion, newVersion: updated.rows[0].version })}::jsonb, 'citizen-portal', ${requireAccount(req).id}, now())`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id, action, target_reference, source, details)
        VALUES (${requireAccount(req).id}, ${'episode_' + action}, ${req.params.id}, 'coordination', ${JSON.stringify({ action, reason, version: updated.rows[0].version })}::jsonb)`);
      if (action === 'withdraw') {
        await tx.execute(sql`UPDATE pair_proposals SET state='withdrawn', status='withdrawn', version=version+1, updated_at=now() WHERE state NOT IN ('declined','withdrawn') AND (own_episode_id=${req.params.id}::uuid OR counterpart_episode_id=${req.params.id}::uuid)`);
        await tx.execute(sql`UPDATE conversations SET closed_at=COALESCE(closed_at,now()), closed_by=COALESCE(closed_by,${requireAccount(req).id}::uuid) WHERE (episode_id=${req.params.id}::uuid OR pair_id IN (SELECT id FROM pair_proposals WHERE own_episode_id=${req.params.id}::uuid OR counterpart_episode_id=${req.params.id}::uuid)) AND closed_at IS NULL`);
        await tx.execute(sql`INSERT INTO follow_up_tasks(episode_id,cause,assigned_team)
          SELECT ${req.params.id}::uuid, 'citizen_withdrawal', 'coordination'
          WHERE NOT EXISTS (SELECT 1 FROM follow_up_tasks f WHERE f.episode_id=${req.params.id}::uuid AND f.cause='citizen_withdrawal')`);
        await tx.execute(sql`INSERT INTO follow_up_tasks(episode_id,booking_id,cause,assigned_team)
          SELECT DISTINCT ${req.params.id}::uuid, b.id, 'citizen_withdrawal_booking_cancellation', 'coordination'
          FROM appointment_requests ar JOIN bookings b ON b.request_id=ar.id AND b.status='confirmed'
          WHERE ar.episode_id=${req.params.id}::uuid
            AND NOT EXISTS (SELECT 1 FROM follow_up_tasks f WHERE f.episode_id=${req.params.id}::uuid AND f.booking_id=b.id AND f.cause='citizen_withdrawal_booking_cancellation')`);
        await tx.execute(sql`INSERT INTO notifications(recipient_account_id,template,safe_reference,channel,delivery_status)
          SELECT DISTINCT staff_id, 'withdrawal_update', ${req.params.id}, 'in_app', 'pending'
          FROM (SELECT sa.primary_staff_id AS staff_id FROM staff_assignments sa WHERE sa.episode_id=${req.params.id}::uuid
            UNION ALL SELECT sa.coverage_staff_id FROM staff_assignments sa WHERE sa.episode_id=${req.params.id}::uuid AND sa.coverage_staff_id IS NOT NULL) assigned
          JOIN accounts recipient ON recipient.id=assigned.staff_id AND recipient.role='coordinator' AND recipient.status='active'
          WHERE NOT EXISTS (SELECT 1 FROM notifications n WHERE n.recipient_account_id=assigned.staff_id AND n.safe_reference=${req.params.id} AND n.template='withdrawal_update')`);
      }
      return updated.rows[0];
    });
    if (!result) return fail(res, 409, 'Episode is stale or inaccessible', 'conflict');
    return json(res, result);
  } catch (e) { return next(e); }
});

router.get('/conversations', async (req, res, next) => {
  try { const account = requireAccount(req); const access = teamConversationAccess(account, (req as PlatformRequest).platformLiveMode === true); const result = await db().execute(sql`SELECT co.id, co.episode_id AS "episodeId" FROM conversations co JOIN episodes e ON e.id=co.episode_id JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id WHERE co.pair_id IS NULL AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.episode_id=e.id OR hl.case_id=c.id) AND hl.state='suspended') AND ${access}`); return json(res, result.rows); } catch (e) { return next(e); }
});

router.get('/hospital/slots', async (req, res, next) => {
  try {
    const hospitalId = typeof req.query.hospitalId === 'string' ? req.query.hospitalId : null;
    const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : null;
    if ((hospitalId !== null && !UUID.test(hospitalId || '')) || (serviceId !== null && !UUID.test(serviceId || ''))) return fail(res, 422, 'Invalid slot filter', 'validation_error');
    const visibility = requireAccount(req).role === 'citizen'
      ? sql`EXISTS (SELECT 1 FROM citizen_cases cc WHERE cc.account_id=${requireAccount(req).id} AND cc.status='active' AND cc.hospital_id=hs.hospital_id AND cc.service_id=hs.service_id)`
      : ['scheduler', 'coordinator'].includes(requireAccount(req).role)
      ? sql`EXISTS (SELECT 1 FROM accounts a WHERE a.id=${requireAccount(req).id} AND a.status='active' AND a.role=${requireAccount(req).role} AND a.hospital_id=hs.hospital_id AND hs.service_id IN (SELECT s.id FROM services s WHERE s.hospital_id=a.hospital_id AND s.code=ANY(a.service_scope::text[])))`
        : sql`false`;
    const result = await db().execute(sql`SELECT hs.id, hs.hospital_id AS "hospitalId", hs.service_id AS "serviceId", hs.slot_reference AS "slotReference", hs.starts_at AS "startsAt", hs.ends_at AS "endsAt", hs.status
      FROM hospital_slots hs WHERE hs.status='published' AND ${visibility}
        AND (${hospitalId}::uuid IS NULL OR hs.hospital_id=${hospitalId}) AND (${serviceId}::uuid IS NULL OR hs.service_id=${serviceId})
      ORDER BY hs.starts_at LIMIT 100`);
    return json(res, result.rows);
  } catch (e) { return next(e); }
});

router.get('/appointments/requests', async (req, res, next) => {
  try {
    const result = await db().execute(sql`SELECT r.id, r.episode_id AS "episodeId", r.slot_reference AS "slotReference", r.preferred_dates AS "preferredDates", r.status, r.version, r.response_source AS "responseSource", r.response_author_reference AS "responseAuthorReference", r.responded_at AS "respondedAt", r.hospital_response_reference AS "hospitalResponseReference", r.created_at AS "createdAt", r.updated_at AS "updatedAt", o.status AS "deliveryStatus", o.attempts AS "deliveryAttempts"
      FROM appointment_requests r JOIN episodes e ON e.id=r.episode_id JOIN citizen_cases c ON c.id=e.case_id
      JOIN services s ON s.id=c.service_id
      LEFT JOIN appointment_outbox o ON o.appointment_request_id=r.id AND o.event_type='appointment.requested'
      WHERE c.status='active' AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.episode_id=e.id OR hl.case_id=c.id) AND hl.state='suspended')
      AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')
      AND ${requireAccount(req).role === 'citizen' ? sql`c.account_id=${requireAccount(req).id}` : requireAccount(req).role === 'scheduler' ? sql`s.hospital_id=${requireAccount(req).hospitalId} AND s.code=ANY(${sqlTextArray(requireAccount(req).serviceScope)})` : requireAccount(req).role === 'coordinator' ? sql`EXISTS (SELECT 1 FROM staff_assignments sa WHERE sa.episode_id=e.id AND ${requireAccount(req).id}=ANY(ARRAY[sa.primary_staff_id,sa.coverage_staff_id])) AND s.hospital_id=${requireAccount(req).hospitalId} AND s.code=ANY(${sqlTextArray(requireAccount(req).serviceScope)})` : sql`false`}
      ORDER BY r.created_at DESC`);
    return json(res, result.rows);
  } catch (e) { return next(e); }
});

router.post('/appointments/requests', requireSameOrigin, async (req, res, next) => {
  try {
    const { episodeId, slotReference = null, preferredDates = null, idempotencyKey } = req.body || {};
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || !Object.keys(req.body).every((key) => APPOINTMENT_FIELDS.has(key)) || !UUID.test(episodeId || '') || (slotReference !== null && (typeof slotReference !== 'string' || !SAFE_REFERENCE.test(slotReference))) || (preferredDates !== null && (!Array.isArray(preferredDates) || preferredDates.length < 1 || preferredDates.length > 5 || preferredDates.some((date) => !validAppointmentDate(date)))) || typeof idempotencyKey !== 'string' || !idempotencyKey.trim() || idempotencyKey.length > 200) return fail(res, 422, 'Invalid appointment request', 'validation_error');
    if (!['citizen', 'coordinator'].includes(requireAccount(req).role)) return fail(res, 403, 'Appointment requests require a Citizen or assigned coordinator', 'forbidden');
    const normalizedKey = idempotencyKey.trim();
    const actor = requireAccount(req);
    const payload = preferredDates == null ? null : JSON.stringify(preferredDates);
    const requestHash = crypto.createHash('sha256').update(JSON.stringify({ episodeId, slotReference, preferredDates })).digest();
    const actorAccess = actor.role === 'citizen'
      ? sql`c.account_id=${actor.id}`
      : sql`EXISTS (SELECT 1 FROM staff_assignments sa JOIN accounts a ON a.id=${actor.id}
          WHERE sa.episode_id=e.id AND sa.service_id=s.id AND a.role='coordinator' AND a.status='active' AND ${actor.id}=ANY(ARRAY[sa.primary_staff_id,sa.coverage_staff_id])
            AND a.hospital_id=${actor.hospitalId} AND s.hospital_id=a.hospital_id AND s.code=ANY(a.service_scope::text[]))
        AND s.hospital_id=${actor.hospitalId} AND s.code=ANY(${sqlTextArray(actor.serviceScope)})`;

    const result = await withTransaction(async (tx) => {
      // Serialize the absent-row case as well as the existing-row replay case.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${actor.id}:${normalizedKey}`}, 0))`);
      const existing = await tx.execute(sql`SELECT r.id, r.episode_id AS "episodeId", r.slot_reference AS "slotReference", r.preferred_dates AS "preferredDates", r.status, r.version, r.created_at AS "createdAt", r.request_hash AS "requestHash", o.status AS "deliveryStatus", o.attempts AS "deliveryAttempts"
        FROM appointment_requests r JOIN episodes e ON e.id=r.episode_id JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
        LEFT JOIN appointment_outbox o ON o.appointment_request_id=r.id AND o.event_type='appointment.requested'
        WHERE r.actor_account_id=${actor.id} AND r.idempotency_key=${normalizedKey}
          AND c.status='active' AND e.participation='active'
          AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.episode_id=e.id OR hl.case_id=c.id) AND hl.state='suspended')
          AND c.hospital_id=s.hospital_id AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')
          AND ${actorAccess}
          AND NOT EXISTS (SELECT 1 FROM (SELECT DISTINCT ON (purpose) purpose,action FROM episode_consents WHERE episode_id=e.id AND consent_version='v1.0' AND scope=('case:' || e.id::text || ':hospital:' || COALESCE(c.hospital_id::text, 'unassigned') || ':v1.0') ORDER BY purpose,created_at DESC,id DESC) latest WHERE latest.action <> 'grant')
          AND (SELECT count(*) FROM (SELECT DISTINCT ON (purpose) purpose,action FROM episode_consents WHERE episode_id=e.id AND consent_version='v1.0' AND scope=('case:' || e.id::text || ':hospital:' || COALESCE(c.hospital_id::text, 'unassigned') || ':v1.0') ORDER BY purpose,created_at DESC,id DESC) latest WHERE latest.action='grant')=2
        FOR UPDATE OF r`);
      if (existing.rowCount) {
        const row = existing.rows[0];
        const priorHash = Buffer.isBuffer(row.requestHash) ? row.requestHash : null;
        const same = priorHash
          ? priorHash.length === requestHash.length && crypto.timingSafeEqual(priorHash, requestHash)
          : row.episodeId === episodeId && row.slotReference === slotReference && JSON.stringify(row.preferredDates) === JSON.stringify(preferredDates);
        if (same && !priorHash) await tx.execute(sql`UPDATE appointment_requests SET request_hash=${requestHash} WHERE id=${row.id} AND request_hash IS NULL`);
        return same ? { row, replay: true } : { mismatch: true };
      }
      const inserted = await tx.execute(sql`INSERT INTO appointment_requests(episode_id,slot_reference,preferred_dates,actor_account_id,idempotency_key,request_hash)
        SELECT ${episodeId}::uuid,${slotReference}::text,${payload ? sql`${payload}::jsonb` : sql`NULL::jsonb`},${actor.id}::uuid,${normalizedKey}::text,${requestHash}::bytea
        FROM episodes e JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
          WHERE e.id=${episodeId} AND c.status='active' AND e.participation='active'
          AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.episode_id=e.id OR hl.case_id=c.id) AND hl.state='suspended')
          AND c.hospital_id=s.hospital_id AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')
          AND ${actorAccess}
          AND NOT EXISTS (SELECT 1 FROM (SELECT DISTINCT ON (purpose) purpose,action FROM episode_consents WHERE episode_id=e.id AND consent_version='v1.0' AND scope=('case:' || e.id::text || ':hospital:' || COALESCE(c.hospital_id::text, 'unassigned') || ':v1.0') ORDER BY purpose,created_at DESC,id DESC) latest WHERE latest.action <> 'grant')
          AND (SELECT count(*) FROM (SELECT DISTINCT ON (purpose) purpose,action FROM episode_consents WHERE episode_id=e.id AND consent_version='v1.0' AND scope=('case:' || e.id::text || ':hospital:' || COALESCE(c.hospital_id::text, 'unassigned') || ':v1.0') ORDER BY purpose,created_at DESC,id DESC) latest WHERE latest.action='grant')=2
          AND (${actor.role === 'coordinator' ? sql`c.hospital_id IS NOT DISTINCT FROM s.hospital_id` : sql`true`})
          AND (${slotReference ? sql`EXISTS (SELECT 1 FROM hospital_slots hs WHERE hs.hospital_id=s.hospital_id AND hs.service_id=s.id AND hs.slot_reference=${slotReference} AND hs.status='published')` : sql`true`})
        RETURNING id, episode_id AS "episodeId", slot_reference AS "slotReference", preferred_dates AS "preferredDates", status, version, created_at AS "createdAt"`);
      if (!inserted.rowCount) return null;
      const row = inserted.rows[0];
      await tx.execute(sql`INSERT INTO appointment_request_history(request_id,status,source,author_reference,details) VALUES (${row.id},'request_pending','ebuhay',${actor.id},${JSON.stringify({ slotReference, preferredDates })}::jsonb)`);
      await tx.execute(sql`INSERT INTO appointment_outbox(appointment_request_id,event_type,payload,idempotency_key)
        SELECT ${row.id}::uuid,'appointment.requested',jsonb_build_object('requestId',${row.id}::text,'episodeId',${episodeId}::text,'hospitalId',c.hospital_id,'serviceId',c.service_id,'slotReference',${slotReference}::text,'preferredDates',${payload ? sql`${payload}::jsonb` : sql`NULL::jsonb`}),${`appointment.requested:${actor.id}:${normalizedKey}`}
        FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=${episodeId}`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id,action,target_reference,source,idempotency_reference,details) VALUES (${actor.id},'appointment_request_created',${row.id},'appointments',${normalizedKey},${JSON.stringify({ deliveryStatus: 'pending' })}::jsonb)`);
      return { row: { ...row, deliveryStatus: 'pending', deliveryAttempts: 0 }, replay: false };
    });
    if (result?.mismatch) return fail(res, 409, 'Idempotency key was reused with different request data', 'conflict');
    if (!result) return fail(res, 404, 'Episode, assignment, or hospital slot not found', 'not_found');
    return json(res, result.row, result.replay ? 200 : 201);
  } catch (e) { return next(e); }
});

router.get('/bookings', async (req, res, next) => {
  try { const result = await db().execute(sql`SELECT b.id, b.request_id AS "requestId", b.slot_reference AS "slotReference", b.hospital_booking_reference AS "hospitalBookingReference", b.status, b.confirmed_at AS "confirmedAt", r.response_source AS "responseSource", r.response_author_reference AS "responseAuthorReference" FROM bookings b JOIN appointment_requests r ON r.id=b.request_id JOIN episodes e ON e.id=r.episode_id JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id WHERE (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood') AND ${requireAccount(req).role === 'citizen' ? sql`c.account_id=${requireAccount(req).id}` : requireAccount(req).role === 'scheduler' ? sql`s.hospital_id=${requireAccount(req).hospitalId} AND s.code=ANY(${sqlTextArray(requireAccount(req).serviceScope)})` : requireAccount(req).role === 'coordinator' ? sql`EXISTS (SELECT 1 FROM staff_assignments sa WHERE sa.episode_id=e.id AND ${requireAccount(req).id}=ANY(ARRAY[sa.primary_staff_id,sa.coverage_staff_id])) AND s.hospital_id=${requireAccount(req).hospitalId} AND s.code=ANY(${sqlTextArray(requireAccount(req).serviceScope)})` : sql`false`} ORDER BY b.created_at DESC`); return json(res, result.rows); } catch (e) { return next(e); }
});

router.post('/appointments/requests/:id/decision', requireSameOrigin, requireRole('scheduler'), (_req, res) =>
  fail(res, 410, 'Bookings require signed Hospital evidence', 'authoritative_event_required'));
router.get('/conversations/:id/messages', async (req, res, next) => {
  try { if (!UUID.test(String(req.params.id))) return fail(res, 422, 'Invalid conversation', 'validation_error'); const account = requireAccount(req); const access = teamConversationAccess(account, (req as PlatformRequest).platformLiveMode === true); const result = await db().execute(sql`SELECT m.id, m.body, m.visibility, m.created_at AS "createdAt", CASE WHEN a.role='citizen' THEN 'citizen' ELSE 'coordination_team' END AS "senderCategory" FROM messages m JOIN accounts a ON a.id=m.sender_account_id WHERE a.role IN ('citizen','coordinator') AND m.conversation_id=${req.params.id} AND EXISTS (SELECT 1 FROM conversations co JOIN episodes e ON e.id=co.episode_id JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id WHERE co.id=m.conversation_id AND co.pair_id IS NULL AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.episode_id=e.id OR hl.case_id=c.id) AND hl.state='suspended') AND ${access}) ORDER BY m.created_at,m.id LIMIT 200`); return json(res, result.rows); } catch (e) { return next(e); }
});
router.post('/conversations/:id/messages', requireSameOrigin, async (req, res, next) => {
  try {
    const account = requireAccount(req); const input = req.body;
    if (!UUID.test(String(req.params.id)) || !input || typeof input !== 'object' || Array.isArray(input) || !Object.keys(input).every((key) => MESSAGE_FIELDS.has(key)) || typeof input.idempotencyKey !== 'string' || !input.idempotencyKey.trim() || input.idempotencyKey.length > 200) return fail(res, 422, 'Invalid message', 'validation_error');
    const messageBody = sanitizeMessageBody(input.body); if (!messageBody) return fail(res, 422, 'Message contains invalid or unsafe text', 'validation_error');
    const requestHash = crypto.createHash('sha256').update(JSON.stringify({ body: messageBody })).digest();
    const result = await withTransaction(async (tx) => {
      await tx.execute(sql`SELECT co.id FROM conversations co JOIN episodes e ON e.id=co.episode_id JOIN citizen_cases c ON c.id=e.case_id WHERE co.id=${req.params.id} AND co.pair_id IS NULL FOR UPDATE OF co,e,c`);
      await tx.execute(sql`SELECT sa.id FROM staff_assignments sa WHERE sa.episode_id=(SELECT episode_id FROM conversations WHERE id=${req.params.id}) FOR UPDATE`);
      const conversation = await tx.execute(sql`SELECT co.id FROM conversations co JOIN episodes e ON e.id=co.episode_id JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id WHERE co.id=${req.params.id} AND co.pair_id IS NULL AND NOT EXISTS (SELECT 1 FROM hospital_linkages hl WHERE (hl.episode_id=e.id OR hl.case_id=c.id) AND hl.state='suspended') AND NOT EXISTS (SELECT 1 FROM (SELECT DISTINCT ON (purpose) purpose,action FROM episode_consents WHERE episode_id=e.id AND consent_version='v1.0' AND scope=('case:' || e.id::text || ':hospital:' || COALESCE(c.hospital_id::text, 'unassigned') || ':v1.0') ORDER BY purpose,created_at DESC,id DESC) latest WHERE latest.action <> 'grant') AND (SELECT count(*) FROM (SELECT DISTINCT ON (purpose) purpose,action FROM episode_consents WHERE episode_id=e.id AND consent_version='v1.0' AND scope=('case:' || e.id::text || ':hospital:' || COALESCE(c.hospital_id::text, 'unassigned') || ':v1.0') ORDER BY purpose,created_at DESC,id DESC) latest WHERE latest.action='grant')=2 AND ${teamConversationAccess(account, (req as PlatformRequest).platformLiveMode === true, true)} FOR UPDATE OF co,e,c`);
      if (!conversation.rowCount) return null;
      const prior = await tx.execute(sql`SELECT id,body,visibility,request_hash AS "requestHash",created_at AS "createdAt" FROM messages WHERE sender_account_id=${account.id} AND idempotency_key=${input.idempotencyKey.trim()} FOR UPDATE`);
      if (prior.rowCount) {
        const priorRow = prior.rows[0]; const hash = priorRow.requestHash as Buffer | null;
        if (hash && (hash.length !== requestHash.length || !crypto.timingSafeEqual(hash, requestHash))) return { mismatch: true };
        return { row: { id: priorRow.id, body: priorRow.body, visibility: priorRow.visibility, createdAt: priorRow.createdAt, senderCategory: account.role === 'citizen' ? 'citizen' : 'coordination_team' }, replay: true };
      }
      const inserted = await tx.execute(sql`INSERT INTO messages(conversation_id,sender_account_id,body,idempotency_key,request_hash) VALUES (${req.params.id},${account.id},${messageBody},${input.idempotencyKey.trim()},${requestHash}) RETURNING id,body,visibility,created_at AS "createdAt"`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id,action,target_reference,source,idempotency_reference,details) VALUES (${account.id},'team_message_sent',${req.params.id},'coordination-messaging',${input.idempotencyKey.trim()},${JSON.stringify({ length: messageBody.length })})`);
      return { row: { ...inserted.rows[0], senderCategory: account.role === 'citizen' ? 'citizen' : 'coordination_team' }, replay: false };
    });
    if (!result) return fail(res, 404, 'Conversation not found', 'not_found'); if ('mismatch' in result) return fail(res, 409, 'Idempotency key was reused with different message data', 'conflict'); return json(res, result.row, result.replay ? 200 : 201);
  } catch (e) { return next(e); }
});

router.get('/notifications', async (req, res, next) => {
  try {
    const account = requireAccount(req);
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
    let query = sql`SELECT id, template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, read_at AS "readAt", created_at AS "createdAt"
      FROM notifications WHERE recipient_account_id=${account.id}`;
    if (cursor) {
      const parts = cursor.split('_');
      if (parts.length === 2) {
        query = sql`${query} AND (created_at, id) < (${parts[0]}::timestamptz, ${parts[1]}::uuid)`;
      }
    }
    query = sql`${query} ORDER BY created_at DESC, id DESC LIMIT ${limit + 1}`;
    const result = await db().execute(query);
    const hasMore = result.rows.length > limit;
    const rawItems = hasMore ? result.rows.slice(0, limit) : result.rows;
    const items = rawItems.map((row: any) => ({
      ...row,
      summary: GENERIC_NOTIFICATION_TEMPLATES[row.template] ?? 'A coordination update is available for your case.',
    }));
    const last = items[items.length - 1];
    const nextCursor = (hasMore && last) ? `${new Date(last.createdAt).toISOString()}_${last.id}` : null;
    if (req.query.cursor !== undefined || req.query.format === 'page') {
      return json(res, { items, nextCursor });
    }
    return json(res, items);
  } catch (e) { return next(e); }
});

router.get('/notifications/preferences', async (req, res, next) => {
  try {
    const account = requireAccount(req);
    const result = await db().execute(sql`SELECT sms_consent AS "smsConsent", phone_number AS "phoneNumber" FROM notification_preferences WHERE account_id=${account.id}`);
    if (!result.rowCount) return json(res, { smsConsent: false, phoneNumberMasked: null });
    const row = result.rows[0] as { smsConsent: boolean; phoneNumber: string | null };
    return json(res, {
      smsConsent: Boolean(row.smsConsent),
      phoneNumberMasked: maskPhoneNumber(row.phoneNumber),
    });
  } catch (e) { return next(e); }
});

router.put('/notifications/preferences', requireSameOrigin, async (req, res, next) => {
  try {
    const account = requireAccount(req);
    const { smsConsent, phoneNumber } = req.body || {};
    if (typeof smsConsent !== 'boolean') return fail(res, 422, 'smsConsent must be a boolean', 'validation_error');
    if (phoneNumber !== undefined && phoneNumber !== null) {
      if (typeof phoneNumber !== 'string' || !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
        return fail(res, 422, 'Invalid phone number format (E.164 required, e.g. +639XXXXXXXXX)', 'validation_error');
      }
    }
    const result = await db().execute(sql`INSERT INTO notification_preferences(account_id, sms_consent, phone_number, updated_at)
      VALUES (${account.id}, ${smsConsent}, ${phoneNumber ?? null}, now())
      ON CONFLICT (account_id) DO UPDATE SET sms_consent=${smsConsent}, phone_number=COALESCE(${phoneNumber ?? null}, notification_preferences.phone_number), updated_at=now()
      RETURNING sms_consent AS "smsConsent", phone_number AS "phoneNumber"`);
    const row = result.rows[0] as { smsConsent: boolean; phoneNumber: string | null };
    return json(res, {
      smsConsent: Boolean(row.smsConsent),
      phoneNumberMasked: maskPhoneNumber(row.phoneNumber),
    });
  } catch (e) { return next(e); }
});

router.post('/notifications/dispatch', requireSameOrigin, async (_req, res, next) => {
  try {
    const stats = await runNotificationBatch();
    return json(res, stats);
  } catch (e) { return next(e); }
});

router.get('/notifications/:id', async (req, res, next) => {
  try {
    const account = requireAccount(req);
    if (!UUID.test(req.params.id)) return fail(res, 422, 'Invalid notification ID', 'validation_error');
    const result = await db().execute(sql`SELECT id, template, safe_reference AS "safeReference", channel, delivery_status AS "deliveryStatus", attempts, read_at AS "readAt", created_at AS "createdAt"
      FROM notifications WHERE id=${req.params.id} AND recipient_account_id=${account.id}`);
    if (!result.rowCount) return fail(res, 404, 'Notification not found', 'not_found');
    const row = result.rows[0] as any;
    return json(res, {
      ...row,
      summary: GENERIC_NOTIFICATION_TEMPLATES[row.template] ?? 'A coordination update is available for your case.',
    });
  } catch (e) { return next(e); }
});

router.post('/notifications/:id/read', requireSameOrigin, async (req, res, next) => {
  try {
    const account = requireAccount(req);
    const notifId = String(req.params.id);
    if (!UUID.test(notifId)) return fail(res, 422, 'Invalid notification ID', 'validation_error');
    const result = await db().execute(sql`UPDATE notifications SET read_at=COALESCE(read_at, now()), updated_at=now()
      WHERE id=${notifId} AND recipient_account_id=${account.id}
      RETURNING id, read_at AS "readAt"`);
    if (!result.rowCount) return fail(res, 404, 'Notification not found', 'not_found');
    return json(res, result.rows[0]);
  } catch (e) { return next(e); }
});

router.post('/simulated-hospital/events', requireSameOrigin, requireRole('doctor','clinical_lead','scheduler','coordinator','hospital_admin'), async (req, res, next) => {
  try { const { sourceNamespace='synthetic-hospital', hospitalId, sourceEventId, eventType, targetReference, sourceVersion=null, occurredAt, payload={} } = req.body || {}; if (!hospitalId || !sourceEventId || !eventType || !targetReference || !occurredAt) return fail(res, 422, 'Invalid source event', 'validation_error'); const hash=crypto.createHash('sha256').update(JSON.stringify(payload)).digest(); const result=await db().execute(sql`INSERT INTO hospital_source_events(source_namespace,hospital_id,source_event_id,event_type,target_reference,source_version,payload_hash,payload,occurred_at,processing_result) VALUES (${sourceNamespace},${hospitalId},${sourceEventId},${eventType},${targetReference},${sourceVersion},${hash},${JSON.stringify(payload)},${occurredAt},'recorded') ON CONFLICT(source_namespace,hospital_id,source_event_id) DO NOTHING RETURNING id, source_event_id AS "sourceEventId", event_type AS "eventType", processing_result AS "processingResult"`); return result.rowCount ? json(res, result.rows[0], 201) : fail(res, 409, 'Source event already exists', 'conflict'); } catch (e) { return next(e); }
});

router.post('/hospital/manual-updates', requireSameOrigin, requireRole('coordinator','scheduler','clinical_lead','hospital_admin'), async (req, res, next) => {
  try {
    const { hospitalId, sourceEventId, eventType, targetReference, sourceVersion=null, occurredAt, payload={} } = req.body || {};
    if (!hospitalId || !sourceEventId || !eventType || !targetReference || !occurredAt) return fail(res, 422, 'Invalid manual update', 'validation_error');
    const hash=crypto.createHash('sha256').update(JSON.stringify(payload)).digest();
    const result=await db().execute(sql`INSERT INTO hospital_source_events(source_namespace,hospital_id,source_event_id,event_type,target_reference,source_version,payload_hash,payload,occurred_at,processing_result) VALUES ('manual-hospital-update',${hospitalId},${sourceEventId},${eventType},${targetReference},${sourceVersion},${hash},${JSON.stringify(payload)},${occurredAt},'recorded') ON CONFLICT(source_namespace,hospital_id,source_event_id) DO NOTHING RETURNING id, source_event_id AS "sourceEventId", processing_result AS "processingResult"`);
    return result.rowCount ? json(res, result.rows[0], 201) : fail(res, 409, 'Source event already exists', 'conflict');
  } catch (e) { return next(e); }
});

// Canonical synthetic workflow commands.  These routes deliberately expose
// projections and attributed facts only; they do not perform matching or
// clinical decisions.
router.post('/hospital/cases', requireSameOrigin, requireRole('coordinator','hospital_admin'), async (req, res, next) => {
  try {
    const { hospitalId, serviceId, hospitalReference, role } = req.body || {};
    if (!hospitalId || !serviceId || !hospitalReference || !['donor','recipient'].includes(role)) return fail(res, 422, 'Invalid hospital case', 'validation_error');
    const q = await withTransaction(async (tx) => {
      const created = await tx.execute(sql`INSERT INTO citizen_cases(hospital_id,service_id,role,account_id)
        SELECT ${hospitalId},${serviceId},${role},NULL WHERE EXISTS (SELECT 1 FROM services s JOIN accounts a ON a.id=${requireAccount(req).id} WHERE s.id=${serviceId} AND s.hospital_id=${hospitalId} AND a.status='active' AND a.display_name IS NOT NULL AND a.hospital_id=s.hospital_id AND (${requireAccount(req).role}='hospital_admin' OR s.code=ANY(a.service_scope::text[])) AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood'))
        RETURNING id, hospital_id AS "hospitalId", service_id AS "serviceId", role, status`);
      if (!created.rowCount) return null;
      await tx.execute(sql`INSERT INTO episodes(case_id) SELECT id FROM (SELECT ${created.rows[0].id}::uuid AS id) x`);
      const episode = await tx.execute(sql`SELECT id FROM episodes WHERE case_id=${created.rows[0].id} ORDER BY created_at DESC LIMIT 1`);
      await tx.execute(sql`INSERT INTO hospital_linkages(case_id,episode_id,hospital_reference) VALUES (${created.rows[0].id},${episode.rows[0].id},${hospitalReference})`);
      return created.rows[0];
    });
    return q ? json(res, q, 201) : fail(res, 404, 'Case not found', 'not_found');
  } catch (e) { return next(e); }
});

router.post('/hospital/cases/:id/invitation', requireSameOrigin, requireRole('coordinator','hospital_admin'), async (req,res,next)=>{ try {
  const actor = requireAccount(req); const token=crypto.randomBytes(32).toString('base64url'); const hash=crypto.createHash('sha256').update(token).digest();
  const intendedUniqid = typeof req.body?.intendedUniqid === 'string' ? req.body.intendedUniqid.trim() : null;
  const intendedAccountId = typeof req.body?.intendedAccountId === 'string' && UUID.test(req.body.intendedAccountId) ? req.body.intendedAccountId : null;
  if (!intendedAccountId && (!intendedUniqid || intendedUniqid.length > 320)) return fail(res, 422, 'A stable identity binding is required', 'binding_required');
  const q=await db().execute(sql`INSERT INTO invitations(purpose,token_hash,intended_account_id,intended_uniqid,target_reference,role,service_scope,hospital_id,issued_by_account_id,expires_at)
    SELECT 'case_claim',${hash},${intendedAccountId},${intendedUniqid},c.id,'citizen',ARRAY[s.code],c.hospital_id,${actor.id},LEAST(now()+interval '24 hours', now()+interval '30 days')
    FROM citizen_cases c JOIN services s ON s.id=c.service_id JOIN accounts actor ON actor.id=${actor.id}
    WHERE c.id=${req.params.id} AND c.account_id IS NULL AND c.status='active' AND s.hospital_id=c.hospital_id
      AND actor.status='active' AND actor.role IN ('coordinator','hospital_admin') AND actor.display_name IS NOT NULL AND char_length(actor.display_name)>0
      AND ${actor.hospitalId ? sql`c.hospital_id=${actor.hospitalId}` : sql`false`} AND (${actor.role === 'hospital_admin' ? sql`true` : sql`s.code=ANY(${sqlTextArray(actor.serviceScope)})`}) AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')
    RETURNING id,expires_at AS "expiresAt",target_reference AS "caseId",purpose`);
  return q.rowCount?json(res,{...q.rows[0],token},201):fail(res,404,'Case not found','not_found');
 }catch(e){return next(e);} });

router.post('/hospital/cases/:id/claim', requireSameOrigin, async (req,res,next)=>{ try {
  const token=req.body?.token; if(typeof token!=='string' || token.length < 32)return fail(res,422,'Claim token is required','validation_error');
  const hash=crypto.createHash('sha256').update(token).digest(); const account=requireAccount(req);
  if (account.role !== 'citizen') return fail(res,403,'Citizen access required','forbidden');
  const outcome=await withTransaction(async (tx)=>{
    const lockedCase=await tx.execute(sql`SELECT c.id FROM citizen_cases c WHERE c.id=${req.params.id} AND c.status='active' FOR UPDATE`);
    if (!lockedCase.rowCount) return {error:'invalid_invitation'};
    const invitation=await tx.execute(sql`SELECT i.id,i.target_reference AS "caseId",i.hospital_id AS "hospitalId",i.service_scope AS "serviceScope",i.role,i.intended_account_id AS "intendedAccountId",i.intended_uniqid AS "intendedUniqid",i.state,i.expires_at AS "expiresAt",i.consumed_at AS "consumedAt",c.account_id AS "ownerId",c.status,c.service_id AS "serviceId",s.code FROM invitations i JOIN citizen_cases c ON c.id=i.target_reference::uuid JOIN services s ON s.id=c.service_id WHERE i.token_hash=${hash} AND i.purpose='case_claim' AND i.target_reference=${req.params.id} AND c.status='active' AND i.hospital_id IS NOT DISTINCT FROM c.hospital_id AND NOT EXISTS (SELECT 1 FROM hospital_linkages blocked WHERE blocked.case_id=c.id AND blocked.state='suspended') AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood') AND (cardinality(i.service_scope) = 1 AND s.code=ANY(i.service_scope)) FOR UPDATE`);
    if(!invitation.rowCount) return {error:'invalid_invitation'}; const i=invitation.rows[0];
    if(i.state!=='active' || new Date(i.expiresAt as string) <= new Date() || i.consumedAt) {
      if (i.ownerId !== account.id || (i.intendedAccountId && i.intendedAccountId !== account.id) || (!i.intendedAccountId && !i.intendedUniqid)) return {error:'invalid_invitation'};
      if (i.intendedUniqid) { const identity=await tx.execute(sql`SELECT 1 FROM egov_identities WHERE account_id=${account.id} AND uniqid=${i.intendedUniqid}`); if(!identity.rowCount)return {error:'identity_mismatch'}; }
      const prior=await tx.execute(sql`SELECT id,state FROM case_claims WHERE invitation_id=${i.id} AND case_id=${req.params.id} AND claimant_account_id=${account.id} AND outcome_hash=${crypto.createHash('sha256').update(`${i.id}:${req.params.id}:${account.id}`).digest()}`);
      return prior.rowCount ? {claim:prior.rows[0],caseId:req.params.id,replay:true} : {error:'invalid_invitation'};
    }
    if(!i.intendedAccountId && !i.intendedUniqid || i.role!=='citizen' || i.ownerId && i.ownerId!==account.id || i.intendedAccountId && i.intendedAccountId!==account.id || ((req as PlatformRequest).platformLiveMode && i.code!=='blood')) return {error:'claim_not_allowed'};
    if(Array.isArray(i.serviceScope) && i.serviceScope.length && !i.serviceScope.includes(i.code)) return {error:'scope_mismatch'};
    if(i.intendedUniqid){ const identity=await tx.execute(sql`SELECT 1 FROM egov_identities WHERE account_id=${account.id} AND uniqid=${i.intendedUniqid}`); if(!identity.rowCount)return {error:'identity_mismatch'}; }
    const outcomeHash=crypto.createHash('sha256').update(`${i.id}:${req.params.id}:${account.id}`).digest();
    const claim=await tx.execute(sql`INSERT INTO case_claims(invitation_id,case_id,claimant_account_id,state,consumed_at,outcome_hash) VALUES (${i.id},${req.params.id},${account.id},'claimed',now(),${outcomeHash}) ON CONFLICT (invitation_id) DO UPDATE SET state=case_claims.state WHERE case_claims.case_id=${req.params.id} AND case_claims.claimant_account_id=${account.id} AND case_claims.outcome_hash=${outcomeHash} RETURNING id,state,version`);
    if (!claim.rowCount) return {error:'claim_conflict'};
    const assigned=await tx.execute(sql`UPDATE citizen_cases SET account_id=${account.id},updated_at=now() WHERE id=${req.params.id} AND (account_id IS NULL OR account_id=${account.id})`);
    if (!assigned.rowCount) return {error:'claim_conflict'};
    const consumed=await tx.execute(sql`UPDATE invitations SET consumed_at=now(),state='consumed',version=version+1 WHERE id=${i.id} AND state='active'`);
    if (!consumed.rowCount) return {error:'claim_conflict'};
    await tx.execute(sql`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES (${account.id},'case_claim_redeemed',${req.params.id},'hospital-invitation',${JSON.stringify({ invitationId:i.id, purpose:'case_claim' })})`);
    return {claim:claim.rows[0],caseId:req.params.id};
  });
  if('error' in outcome) return fail(res,409,'Claim invitation is invalid or not authorized','claim_rejected'); return json(res,outcome,201);
 }catch(e){return next(e);} });

router.post('/hospital/linkages/:id/verify', requireSameOrigin, requireRole('coordinator','clinical_lead','hospital_admin'), async (req,res,next)=>{
  try {
    const { hospitalEvidenceReference, method='manual', expectedVersion=1 } = req.body || {};
    if (!hospitalEvidenceReference || !Number.isInteger(expectedVersion)) return fail(res,422,'Evidence reference and version are required','validation_error');
    const q = await withTransaction(async (tx) => {
      const lock = await tx.execute(sql`SELECT c.id FROM hospital_linkages hl JOIN citizen_cases c ON c.id=hl.case_id WHERE hl.id=${req.params.id} FOR UPDATE OF c`);
      if (!lock.rowCount) return null;
      const u = await tx.execute(sql`UPDATE hospital_linkages hl SET state='verified',verification_method=${method},verification_source=${hospitalEvidenceReference},verifier_account_id=${requireAccount(req).id},verified_at=now(),version=version+1,updated_at=now() WHERE hl.id=${req.params.id} AND hl.state IN ('pending','suspended') AND hl.version=${expectedVersion} AND EXISTS (SELECT 1 FROM citizen_cases c JOIN services s ON s.id=c.service_id JOIN accounts a ON a.id=${requireAccount(req).id} WHERE c.id=hl.case_id AND c.hospital_id=a.hospital_id AND a.status='active' AND a.display_name IS NOT NULL AND (${requireAccount(req).role}='hospital_admin' OR s.code=ANY(a.service_scope::text[])) AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')) RETURNING hl.id,hl.case_id AS "caseId",hl.state,hl.hospital_reference AS "hospitalReference",hl.version`);
      if (!u.rowCount) return null;
      await tx.execute(sql`INSERT INTO hospital_linkage_history(linkage_id,state,hospital_reference,evidence_reference,method,actor_account_id,version) SELECT id,state,hospital_reference,${hospitalEvidenceReference},${method},${requireAccount(req).id},version FROM hospital_linkages WHERE id=${req.params.id}`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES (${requireAccount(req).id},'hospital_linkage_verified',${req.params.id},'hospital-verification',${JSON.stringify({ evidenceReference:hospitalEvidenceReference })})`);
      return u.rows[0];
    });
    return q ? json(res,q) : fail(res,409,'Linkage is unavailable','conflict');
  } catch(e) { return next(e); }
});
router.post('/hospital/linkages/:id/suspend', requireSameOrigin, requireRole('coordinator','clinical_lead','hospital_admin'), async (req,res,next)=>{
  try {
    const expectedVersion = req.body?.expectedVersion ?? 1;
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return fail(res,422,'Expected version is required','validation_error');
    const q = await withTransaction(async (tx) => {
      const lock = await tx.execute(sql`SELECT c.id FROM hospital_linkages hl JOIN citizen_cases c ON c.id=hl.case_id WHERE hl.id=${req.params.id} FOR UPDATE OF c`);
      if (!lock.rowCount) return null;
      const u = await tx.execute(sql`UPDATE hospital_linkages hl SET state='suspended',version=version+1,updated_at=now() WHERE hl.id=${req.params.id} AND hl.version=${expectedVersion} AND EXISTS (SELECT 1 FROM citizen_cases c JOIN services s ON s.id=c.service_id JOIN accounts a ON a.id=${requireAccount(req).id} WHERE c.id=hl.case_id AND c.hospital_id=a.hospital_id AND a.status='active' AND a.display_name IS NOT NULL AND (${requireAccount(req).role}='hospital_admin' OR s.code=ANY(a.service_scope::text[])) AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')) RETURNING hl.id,hl.state,hl.hospital_reference AS "hospitalReference",hl.version`);
      if (!u.rowCount) return null;
      await tx.execute(sql`INSERT INTO hospital_linkage_history(linkage_id,state,hospital_reference,method,actor_account_id,version) SELECT id,state,hospital_reference,'suspension',${requireAccount(req).id},version FROM hospital_linkages WHERE id=${req.params.id}`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id,action,target_reference,source) VALUES (${requireAccount(req).id},'hospital_linkage_suspended',${req.params.id},'hospital-verification')`);
      return u.rows[0];
    });
    return q ? json(res,q) : fail(res,409,'Linkage is unavailable','conflict');
  } catch(e) { return next(e); }
});
router.post('/hospital/linkages/:id/correct', requireSameOrigin, requireRole('coordinator','clinical_lead','hospital_admin'), async (req,res,next)=>{
  try {
    const { hospitalEvidenceReference, hospitalReference, reason, expectedVersion=1 } = req.body || {};
    if (!hospitalEvidenceReference || !hospitalReference || !reason || !Number.isInteger(expectedVersion)) return fail(res,422,'Correction evidence, reason, and version are required','validation_error');
    const q = await withTransaction(async (tx) => {
      const lock = await tx.execute(sql`SELECT c.id FROM hospital_linkages hl JOIN citizen_cases c ON c.id=hl.case_id WHERE hl.id=${req.params.id} FOR UPDATE OF c`);
      if (!lock.rowCount) return null;
      const u = await tx.execute(sql`UPDATE hospital_linkages hl SET hospital_reference=${hospitalReference},verification_source=${hospitalEvidenceReference},verifier_account_id=${requireAccount(req).id},version=version+1,updated_at=now() WHERE hl.id=${req.params.id} AND hl.version=${expectedVersion} AND EXISTS (SELECT 1 FROM citizen_cases c JOIN services s ON s.id=c.service_id JOIN accounts a ON a.id=${requireAccount(req).id} WHERE c.id=hl.case_id AND c.hospital_id=a.hospital_id AND a.status='active' AND a.display_name IS NOT NULL AND (${requireAccount(req).role}='hospital_admin' OR s.code=ANY(a.service_scope::text[])) AND (${(req as PlatformRequest).platformLiveMode !== true} OR s.code='blood')) RETURNING hl.id,hl.case_id AS "caseId",hl.state,hl.hospital_reference AS "hospitalReference",hl.version`);
      if (!u.rowCount) return null;
      await tx.execute(sql`INSERT INTO hospital_linkage_history(linkage_id,state,hospital_reference,evidence_reference,method,actor_account_id,reason,version) SELECT id,state,hospital_reference,${hospitalEvidenceReference},'correction',${requireAccount(req).id},${reason},version FROM hospital_linkages WHERE id=${req.params.id}`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES (${requireAccount(req).id},'hospital_linkage_corrected',${req.params.id},'hospital-verification',${JSON.stringify({ reason, evidenceReference:hospitalEvidenceReference })})`);
      return u.rows[0];
    });
    return q ? json(res,q) : fail(res,409,'Linkage version conflict','conflict');
  } catch(e) { return next(e); }
});

router.post('/coordinator-assignments', requireSameOrigin, requireRole('coordinator','hospital_admin'), async (req, res, next) => {
  try {
    const { episodeId, primaryStaffId, coverageStaffId = null, serviceId, version = 1 } = req.body || {};
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || !Object.keys(req.body).every((key) => ASSIGNMENT_FIELDS.has(key)) || !UUID.test(episodeId || '') || !UUID.test(primaryStaffId || '') || (coverageStaffId !== null && !UUID.test(coverageStaffId || '')) || !UUID.test(serviceId || '') || !Number.isInteger(version) || version < 1) return fail(res, 422, 'Invalid assignment', 'validation_error');
        const q = await withTransaction(async (tx) => {
          await tx.execute(sql`SELECT c.id FROM episodes e JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id WHERE e.id=${episodeId} AND c.hospital_id=s.hospital_id FOR UPDATE OF c,e`);
          const assignment = await tx.execute(sql`INSERT INTO staff_assignments(episode_id,primary_staff_id,coverage_staff_id,service_id,version)
            SELECT ${episodeId},${primaryStaffId},${coverageStaffId},${serviceId},${version}
            FROM episodes e JOIN citizen_cases c ON c.id=e.case_id JOIN services s ON s.id=c.service_id
            JOIN accounts actor ON actor.id=${requireAccount(req).id}
            JOIN accounts primary_staff ON primary_staff.id=${primaryStaffId} AND primary_staff.role='coordinator' AND primary_staff.status='active'
            LEFT JOIN accounts coverage_staff ON coverage_staff.id=${coverageStaffId} AND coverage_staff.role='coordinator' AND coverage_staff.status='active'
            WHERE e.id=${episodeId} AND s.id=${serviceId} AND actor.status='active'
              AND (actor.role='hospital_admin' AND actor.hospital_id=s.hospital_id OR actor.role='coordinator' AND actor.hospital_id=s.hospital_id AND s.code=ANY(actor.service_scope::text[]))
              AND primary_staff.hospital_id=s.hospital_id AND s.code=ANY(primary_staff.service_scope::text[])
              AND (${coverageStaffId}::uuid IS NULL OR (coverage_staff.hospital_id=s.hospital_id AND s.code=ANY(coverage_staff.service_scope::text[])))
            RETURNING id, episode_id AS "episodeId", primary_staff_id AS "primaryStaffId", coverage_staff_id AS "coverageStaffId", service_id AS "serviceId", version`);
      if (!assignment.rowCount) return null;
      // Team channels are distinct from anonymous pair conversations (pair_id NULL).
      await tx.execute(sql`INSERT INTO conversations(episode_id) SELECT ${episodeId} WHERE NOT EXISTS (SELECT 1 FROM conversations WHERE episode_id=${episodeId} AND pair_id IS NULL)`);
      await tx.execute(sql`INSERT INTO audit_events(actor_account_id,action,target_reference,source,details) VALUES (${requireAccount(req).id},'coordinator_assignment_created',${episodeId},'coordination-assignment',${JSON.stringify({ serviceId, primaryStaffId, coverageStaffId })})`);
      return assignment.rows[0];
    });
    return q ? json(res, q, 201) : fail(res, 404, 'Episode not found', 'not_found');
  } catch (e) { return next(e); }
});

router.post('/admin/sessions/:id/revoke', requireSameOrigin, requireRole('hospital_admin','supervisor'), async (req,res,next)=>{ try { const q=await db().execute(sql`UPDATE sessions SET revoked_at=COALESCE(revoked_at,now()) WHERE id=${req.params.id} RETURNING id,revoked_at AS "revokedAt"`); return q.rowCount?json(res,q.rows[0]):fail(res,404,'Session not found','not_found'); }catch(e){return next(e);} });

router.get('/hospital/roster', requireRole('coordinator','clinical_lead','hospital_admin','scheduler'), async (req, res, next) => {
  try { const q = await db().execute(sql`SELECT id, display_name AS "displayName", role, service_scope AS "serviceScope", hospital_id AS "hospitalId" FROM accounts WHERE role IN ('coordinator','doctor','clinical_lead','scheduler') AND status='active' AND (${req.query.serviceId || null} IS NULL OR ${req.query.serviceId} = ANY(service_scope)) ORDER BY display_name`); return json(res, q.rows); } catch (e) { return next(e); }
});

router.post('/pairs', requireSameOrigin, async (req, res, next) => {
  try {
    const { ownEpisodeId, counterpartEpisodeId = null } = req.body || {};
    if (!ownEpisodeId) return fail(res, 422, 'Episode is required', 'validation_error');
    const q = await db().execute(sql`INSERT INTO pair_proposals(own_episode_id,counterpart_episode_id,invitation_hash,invitation_expires_at) SELECT ${ownEpisodeId},${counterpartEpisodeId},${crypto.createHash('sha256').update(crypto.randomBytes(32)).digest()},now()+interval '24 hours' WHERE EXISTS (SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=${ownEpisodeId} AND c.account_id=${requireAccount(req).id} AND e.participation='active') RETURNING id, status, own_episode_id AS "ownEpisodeId", counterpart_episode_id AS "counterpartEpisodeId", own_confirmed_at AS "ownConfirmedAt", counterpart_confirmed_at AS "counterpartConfirmedAt"`);
    return q.rowCount ? json(res, q.rows[0], 201) : fail(res, 404, 'Episode not found', 'not_found');
  } catch (e) { return next(e); }
});

router.post('/pairs/:id/confirm', requireSameOrigin, async (req, res, next) => {
  try {
    const q = await db().execute(sql`UPDATE pair_proposals p SET own_confirmed_at=CASE WHEN EXISTS (SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=p.own_episode_id AND c.account_id=${requireAccount(req).id}) THEN COALESCE(p.own_confirmed_at,now()) ELSE p.own_confirmed_at END, counterpart_confirmed_at=CASE WHEN EXISTS (SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=p.counterpart_episode_id AND c.account_id=${requireAccount(req).id}) THEN COALESCE(p.counterpart_confirmed_at,now()) ELSE p.counterpart_confirmed_at END, status=CASE WHEN (p.own_confirmed_at IS NOT NULL OR EXISTS (SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=p.own_episode_id AND c.account_id=${requireAccount(req).id})) AND (p.counterpart_confirmed_at IS NOT NULL OR EXISTS (SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=p.counterpart_episode_id AND c.account_id=${requireAccount(req).id})) THEN 'confirmed' ELSE p.status END, updated_at=now() WHERE p.id=${req.params.id} AND p.status IN ('proposed','awaiting_citizen_acceptance') RETURNING id,status,own_confirmed_at AS "ownConfirmedAt",counterpart_confirmed_at AS "counterpartConfirmedAt"`);
    return q.rowCount ? json(res, q.rows[0]) : fail(res, 404, 'Pair not found', 'not_found');
  } catch (e) { return next(e); }
});

router.post('/pairs/:id/verify', requireSameOrigin, requireRole('coordinator','clinical_lead'), async (req, res, next) => {
  try { const { hospitalEvidenceReference } = req.body || {}; if (!hospitalEvidenceReference) return fail(res, 422, 'Evidence reference is required', 'validation_error'); const q = await db().execute(sql`UPDATE pair_proposals SET verified_by=${requireAccount(req).id},verified_at=now(),status='verified',updated_at=now() WHERE id=${req.params.id} AND own_confirmed_at IS NOT NULL AND counterpart_confirmed_at IS NOT NULL AND status='confirmed' RETURNING id,status,verified_at AS "verifiedAt"`); return q.rowCount ? json(res,q.rows[0]) : fail(res,409,'Pair is not ready for verification','conflict'); } catch(e){return next(e);}
});

router.get('/pairs/:id', async (req,res,next)=>{ try { const q=await db().execute(sql`SELECT id,status,own_episode_id AS "ownEpisodeId",counterpart_episode_id AS "counterpartEpisodeId",own_confirmed_at AS "ownConfirmedAt",counterpart_confirmed_at AS "counterpartConfirmedAt",verified_at AS "verifiedAt" FROM pair_proposals p WHERE p.id=${req.params.id} AND (EXISTS (SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=p.own_episode_id AND c.account_id=${requireAccount(req).id}) OR EXISTS (SELECT 1 FROM episodes e JOIN citizen_cases c ON c.id=e.case_id WHERE e.id=p.counterpart_episode_id AND c.account_id=${requireAccount(req).id}))`); return q.rowCount?json(res,q.rows[0]):fail(res,404,'Pair not found','not_found'); }catch(e){return next(e);} });

router.post('/appointments/requests/:id/changes', requireSameOrigin, async (req,res,next)=>{ try { const { intent, preferences=null, idempotencyKey, version=1 }=req.body||{}; if(!['cancel','reschedule'].includes(intent)||!idempotencyKey)return fail(res,422,'Invalid booking change','validation_error'); const q=await db().execute(sql`INSERT INTO booking_changes(request_id,booking_id,intent,preferences,actor_account_id,idempotency_key,version) SELECT r.id,b.id,${intent},${preferences?JSON.stringify(preferences):null},${requireAccount(req).id},${idempotencyKey},${version} FROM appointment_requests r JOIN bookings b ON b.request_id=r.id JOIN episodes e ON e.id=r.episode_id JOIN citizen_cases c ON c.id=e.case_id WHERE r.id=${req.params.id} AND c.account_id=${requireAccount(req).id} ON CONFLICT(actor_account_id,idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING id,request_id AS "requestId",booking_id AS "bookingId",intent,status`); return q.rowCount?json(res,q.rows[0],201):fail(res,404,'Booking not found','not_found'); }catch(e){return next(e);} });

/**
 * Versioned Citizen surface. Keep the legacy platform router additive while
 * exposing only cases/intake resources through /api/v1.
 */
export function createCitizenPlatformRouter(mode: RuntimeMode) {
  const citizen = express.Router();
  citizen.use((req, res, next) => {
    if (!(/^\/services$|^\/cases(?:\/[0-9a-f-]+(?:\/episodes|\/invitation|\/claim)?)?$|^\/episodes(?:\/[0-9a-f-]+)?(?:\/intake|\/pause|\/resume|\/withdraw|\/consent)?$|^\/hospital\/cases(?:\/[0-9a-f-]+(?:\/invitation|\/claim)?)?$|^\/hospital\/linkages\/[0-9a-f-]+\/(?:verify|suspend|correct)$|^\/hospital\/slots$|^\/appointments\/requests$|^\/bookings$|^\/conversations(?:\/[0-9a-f-]+\/messages)?$|^\/notifications(?:\/(?:preferences|dispatch|[0-9a-f-]+(?:\/read)?))?$/.test(req.path))) {
      return next('router');
    }
    (req as PlatformRequest).platformLiveMode = mode === 'controlled-live' || mode === 'production';
    return next();
  });
  citizen.use(router);
  return citizen;
}

export default router;

