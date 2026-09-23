import express from 'express';
import { SESSION_COOKIE, logout, listSessions, listVerificationHistory, revokeSession } from '../auth/service.js';
import { cookies, requireSession } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
import { clearCookie } from '../auth/cookie.js';
import type { RuntimeConfig } from '../runtime/config.js';

export function createSessionRouter(_config?: RuntimeConfig) {
  const router = express.Router();

  router.all(['/admission-requests', '/invitations', '/invitations/*', '/redeem', '/redeem-invitation'], (_req, res) =>
    res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' })
  );

  router.get(['/current', '/current-session', '/session', '/me'], requireSession, (req, res) => res.json({ success: true, account: req.account }));
  router.get('/sessions', requireSession, async (req, res, next) => {
    try {
      return res.json({ success: true, sessions: await listSessions(req.account!.id, cookies(req)[SESSION_COOKIE]) });
    } catch (error) { return next(error); }
  });
  router.get('/verification-history', requireSession, async (req, res, next) => {
    try {
      return res.json({ success: true, history: await listVerificationHistory(req.account!.id) });
    } catch (error) { return next(error); }
  });
  router.post('/sessions/:id/revoke', requireSession, requireSameOrigin, async (req, res, next) => {
    try {
      const id = String(req.params.id);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        return res.status(422).json({ success: false, error: 'validation_error', message: 'Invalid session id' });
      }
      const revoked = await revokeSession(req.account!.id, id);
      return revoked ? res.json({ success: true, session: revoked }) : res.status(404).json({ success: false, error: 'not_found', message: 'Session not found' });
    } catch (error) { return next(error); }
  });
  router.post('/logout', requireSameOrigin, async (req, res, next) => {
    try {
      await logout(cookies(req)[SESSION_COOKIE]);
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${clearCookie}`);
      return res.status(204).end();
    } catch (error) { return next(error); }
  });

  return router;
}
export default createSessionRouter();
