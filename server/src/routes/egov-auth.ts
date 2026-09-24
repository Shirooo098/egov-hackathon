import express from 'express';
import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import type { RuntimeConfig } from '../runtime/config.js';
import { requireSameOrigin } from '../middleware/origin.js';
import { cookies } from '../middleware/auth.js';
import { SESSION_COOKIE, currentSession } from '../auth/service.js';
import { cookieOptions } from '../auth/cookie.js';
import { createPending, pendingIdentity, confirmPending, cancelPending, PENDING_COOKIE, readCookie, clearPendingCookie } from '../auth/egov-citizen.js';
import { EgovProviderError, verifyEgovExchange, type ProviderFetch } from '../auth/egov-provider.js';
import { getPool } from '../db/pool.js';

type Options = { providerFetch?: ProviderFetch };
const unavailable = (res: Response) => res.status(503).json({ success: false, error: 'egov_unavailable', message: 'Official eGov authentication is unavailable. Please retry.' });
const codeHash = (code: string) => crypto.createHash('sha256').update(code).digest();
const configured = (config: RuntimeConfig) => Boolean(config.egovBaseUrl && config.egovPartnerCode && config.egovPartnerSecret);
async function reserveCode(code: string) {
  const result = await getPool().query(`INSERT INTO egov_exchange_transactions(code_hash,uniqid,provider,expires_at) VALUES($1,'pending','egovph',now()+interval '10 minutes') ON CONFLICT(code_hash) DO NOTHING RETURNING id`, [codeHash(code)]);
  return result.rowCount ? String(result.rows[0].id) : null;
}

function exchangeHandler(config: RuntimeConfig, options: Options, redirect: boolean) {
  return async (req: Request, res: Response, next: (error?: unknown) => void) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    const code = redirect ? req.query.exchange_code : req.body?.exchange_code;
    if (typeof code !== 'string' || !code || code.length > 2048) return res.status(422).json({ success: false, error: 'validation_error', message: 'A valid exchange code is required' });
    try {
      if (!configured(config)) return unavailable(res);
      if (await currentSession(cookies(req)[SESSION_COOKIE])) return res.status(409).json({ success: false, error: 'session_exists', message: 'An active session already exists' });
      const transactionId = await reserveCode(code);
      if (!transactionId) return res.status(409).json({ success: false, error: 'exchange_replayed', message: 'Exchange code has already been used' });
      const identity = await verifyEgovExchange({ baseUrl: config.egovBaseUrl, partnerCode: config.egovPartnerCode, partnerSecret: config.egovPartnerSecret }, code, options.providerFetch);
      await getPool().query(`UPDATE egov_exchange_transactions SET uniqid=$1 WHERE id=$2`, [identity.uniqid, transactionId]);
      const pending = await createPending(identity, transactionId);
      res.setHeader('Set-Cookie', pending.setCookie);
      return redirect ? res.redirect(303, '/onboarding') : res.json({ success: true, data: { pendingId: pending.pendingId, displayName: identity.displayName } });
    } catch (error) { if (error instanceof EgovProviderError) return unavailable(res); return next(error); }
  };
}

export function createEgovAuthRouter(config: RuntimeConfig, options: Options = {}) {
  const router = express.Router();
  router.get('/pending', async (req, res, next) => { try { const identity = await pendingIdentity(readCookie(req.get('cookie'), PENDING_COOKIE)); return identity ? res.json({ success: true, data: identity }) : res.status(404).json({ success: false, error: 'pending_missing', message: 'No pending eGov identity' }); } catch (error) { next(error); } });
  router.get('/widget-config', (_req, res) => configured(config) ? res.json({ success: true, data: { partnerCode: config.egovPartnerCode, baseUrl: config.egovBaseUrl } }) : unavailable(res));
  router.post('/exchange', requireSameOrigin, exchangeHandler(config, options, false));
  router.post('/confirm', requireSameOrigin, async (req, res, next) => {
    try {
      const result = await confirmPending(readCookie(req.get('cookie'), PENDING_COOKIE), typeof req.body?.pendingId === 'string' ? req.body.pendingId : undefined, cookies(req)[SESSION_COOKIE]);
      if ('error' in result) return res.status(result.error === 'session_exists' ? 409 : 422).json({ success: false, error: result.error, message: result.error === 'session_exists' ? 'An active session already exists' : 'Pending eGov identity is unavailable' });
      const sessionCookie = `${SESSION_COOKIE}=${result.session}; ${cookieOptions}`;
      res.setHeader('Set-Cookie', [sessionCookie, clearPendingCookie]);
      return res.json({ success: true, account: result.account });
    } catch (error) { next(error); }
  });
  router.post('/cancel', requireSameOrigin, async (req, res, next) => { try { const cancelled = await cancelPending(readCookie(req.get('cookie'), PENDING_COOKIE), typeof req.body?.pendingId === 'string' ? req.body.pendingId : undefined); if (!cancelled) return res.status(422).json({ success: false, error: 'pending_missing', message: 'Pending eGov identity is unavailable' }); res.setHeader('Set-Cookie', clearPendingCookie); return res.status(204).end(); } catch (error) { next(error); } });
  router.all(['/synthetic/exchange-code', '/synthetic', '/synthetic/*', '/callback'], (_req, res) => res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' }));
  return router;
}

export function createEgovCallbackRouter(config: RuntimeConfig, options: Options = {}) {
  const router = express.Router();
  router.get('/sso', exchangeHandler(config, options, true));
  return router;
}
export default createEgovAuthRouter;
