import express from 'express';
import crypto from 'crypto';
import { SESSION_COOKIE, SESSION_TTL_MS, redeemInvitation, logout, listSessions, listVerificationHistory, revokeSession } from '../auth/service.js';
import { cookies, requireSession } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import { getPool } from '../db/pool.js';
import { cookieOptions, clearCookie } from '../auth/cookie.js';
import type { RuntimeConfig } from '../runtime/config.js';

export function createSessionRouter(config?: RuntimeConfig) {
const router = express.Router();
const syntheticOnly = (_req: express.Request, res: express.Response, next: express.NextFunction) => config?.mode === 'synthetic' ? next() : res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' });
const roles = ['citizen', 'coordinator', 'doctor', 'clinical_lead', 'hospital_admin', 'scheduler', 'supervisor', 'blood_approver'];
const scopes = ['blood', 'kidney'];
const invalidInvitation = () => ({ success: false, message: 'Invalid or expired invitation' });
const admissionRequestFields = new Set(['contact']);
const invitationFields = new Set(['purpose', 'role', 'intendedContact', 'intendedAccountId', 'serviceScope', 'hospitalId']);
const hasOnlyKeys = (value: unknown, allowed: Set<string>) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).every((key) => allowed.has(key));

router.post('/admission-requests', requireSameOrigin, async (req, res, next) => {
  try {
    if (!hasOnlyKeys(req.body, admissionRequestFields)) return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid contact' });
    const contact = typeof req.body?.contact === 'string' ? req.body.contact.trim() : '';
    if (contact.length < 3 || contact.length > 320 || /[\u0000-\u001f\u007f]/.test(contact)) return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid contact' });
    await getPool().query('INSERT INTO admission_requests(contact) VALUES ($1) ON CONFLICT DO NOTHING', [contact.toLowerCase()]);
    return res.status(202).json({ success: true, message: 'Your request has been received.' });
  } catch (error) { return next(error); }
});

router.post('/invitations', syntheticOnly, requireSameOrigin, async (req, res, next) => {
  try {
    if (!process.env.SYNTHETIC_BOOTSTRAP_SECRET || req.get('x-bootstrap-secret') !== process.env.SYNTHETIC_BOOTSTRAP_SECRET) return res.status(403).json({ success: false, error: 'forbidden', message: 'Bootstrap access required' });
    if (config?.mode !== 'synthetic') return res.status(403).json({ success: false, error: 'demo_disabled', message: 'Synthetic bootstrap is disabled' });
    if (!hasOnlyKeys(req.body, invitationFields)) return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid invitation fields' });
    const purpose = req.body?.purpose || 'admission';
    const role = purpose === 'admission' ? (req.body?.role || 'citizen') : null;
    const intendedContact = req.body?.intendedContact == null ? null : (typeof req.body.intendedContact === 'string' ? req.body.intendedContact.trim() : undefined);
    const serviceScope = req.body?.serviceScope || [];
    const intendedAccountId = req.body?.intendedAccountId;
    const hospitalId = req.body?.hospitalId;
    const staffRole = ['coordinator', 'doctor', 'clinical_lead', 'hospital_admin', 'scheduler', 'supervisor'].includes(role);
    const commonValid = ['admission', 'login'].includes(purpose) && Array.isArray(serviceScope)
      && serviceScope.length <= 2 && new Set(serviceScope).size === serviceScope.length
      && serviceScope.every((value) => scopes.includes(value));
    const hospitalIdValid = typeof hospitalId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(hospitalId);
    const admissionValid = purpose === 'admission' && roles.includes(role) && intendedAccountId === undefined
      && typeof intendedContact === 'string' && intendedContact.length >= 3 && intendedContact.length <= 320
      && !/[\u0000-\u001f\u007f]/.test(intendedContact)
      && (staffRole ? hospitalIdValid && serviceScope.length > 0 : hospitalId === undefined);
    const loginValid = purpose === 'login' && req.body.role === undefined && req.body.intendedContact === undefined
      && req.body.serviceScope === undefined && req.body.hospitalId === undefined && typeof intendedAccountId === 'string'
      && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(intendedAccountId);
    if (!commonValid || (!admissionValid && !loginValid)) return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid invitation fields' });
    if (admissionValid && staffRole) {
      const hospital = await getPool().query('SELECT id FROM hospitals WHERE id = $1 AND synthetic = true', [hospitalId]);
      if (!hospital.rowCount) return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid hospital' });
    }
    const token = crypto.randomBytes(32).toString('base64url');
    const hash = crypto.createHash('sha256').update(token).digest();
    const result = purpose === 'admission'
      ? await getPool().query(`INSERT INTO invitations(purpose, token_hash, intended_contact, role, service_scope, hospital_id, expires_at)
          VALUES ('admission',$1,$2,$3,$4,$5,now()+interval '24 hours') RETURNING id, expires_at AS "expiresAt"`, [hash, intendedContact.toLowerCase(), role, serviceScope, staffRole ? hospitalId : null])
      : await getPool().query(`INSERT INTO invitations(purpose, token_hash, intended_account_id, service_scope, expires_at)
          SELECT 'login',$1,id,'{}',now()+interval '24 hours' FROM accounts WHERE id=$2 AND status='active'
          RETURNING id, expires_at AS "expiresAt"`, [hash, intendedAccountId]);
    if (!result.rowCount) return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid invitation fields' });
    return res.status(201).json({ success: true, data: { ...result.rows[0], token } });
  } catch (error) { return next(error); }
});

router.post(['/redeem', '/redeem-invitation', '/invitations/redeem'], syntheticOnly, requireSameOrigin, async (req, res, next) => {
  try {
    const session = await redeemInvitation(req.body?.token);
    if (!session) return res.status(400).json(invalidInvitation());
    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; ${cookieOptions}`);
    return res.status(201).json({ success: true, account: session.account });
  } catch (error) { return next(error); }
});

router.get(['/current', '/current-session', '/session', '/me'], requireSession, (req, res) => res.json({ success: true, account: req.account }));
router.get('/sessions', requireSession, async (req, res, next) => { try { return res.json({ success: true, sessions: await listSessions(req.account!.id, cookies(req)[SESSION_COOKIE]) }); } catch (error) { return next(error); } });
router.get('/verification-history', requireSession, async (req, res, next) => { try { return res.json({ success: true, history: await listVerificationHistory(req.account!.id) }); } catch (error) { return next(error); } });
router.post('/sessions/:id/revoke', requireSession, requireSameOrigin, async (req, res, next) => { try { const id = String(req.params.id); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid session id' }); const revoked = await revokeSession(req.account!.id, id); return revoked ? res.json({ success: true, session: revoked }) : res.status(404).json({ success: false, error: 'not_found', message: 'Session not found' }); } catch (error) { return next(error); } });
router.post('/logout', requireSameOrigin, async (req, res, next) => {
  try { await logout(cookies(req)[SESSION_COOKIE]); res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${clearCookie}`); return res.status(204).end(); } catch (error) { return next(error); }
});

return router;
}
export default createSessionRouter();
