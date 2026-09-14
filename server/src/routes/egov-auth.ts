import express from 'express';
import { exchangeSyntheticCode, completeEgovLogin, issueSyntheticExchangeCode, syntheticEgovAvailable, type SyntheticEgovProfile } from '../auth/egov.js';
import type { RuntimeConfig } from '../runtime/config.js';
import { SESSION_COOKIE } from '../auth/service.js';
import { cookieOptions } from '../auth/cookie.js';
import { requireSameOrigin } from '../middleware/origin.js';

type EgovAuthDependencies = {
  issueCode?: (profile: SyntheticEgovProfile) => string;
  completeLogin?: ((code: string, invitation: string, profile: SyntheticEgovProfile) => Promise<{ token: string; account: unknown } | null>) | ((code: string, invitation: string | undefined, profile: SyntheticEgovProfile) => Promise<{ token: string; account: unknown } | null>);
};

export function createEgovAuthRouter(config: RuntimeConfig, dependencies: EgovAuthDependencies = {}) {
  const router = express.Router();
  router.post('/synthetic/exchange-code', requireSameOrigin, (req, res) => {
    if (config.mode !== 'synthetic') return res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' });
    if (!process.env.SYNTHETIC_BOOTSTRAP_SECRET || req.get('x-bootstrap-secret') !== process.env.SYNTHETIC_BOOTSTRAP_SECRET) return res.status(403).json({ success: false, error: 'forbidden', message: 'Bootstrap access required' });
    const profile = req.body?.profile;
    try {
      const code = (dependencies.issueCode || issueSyntheticExchangeCode)(profile);
      return res.status(201).json({ success: true, data: { exchange_code: code } });
    } catch { return res.status(503).json({ success: false, error: 'egov_unavailable', message: 'Authentication is unavailable' }); }
  });
  router.post(['/exchange', '/callback'], requireSameOrigin, async (req, res, next) => {
    try {
      if (config.mode !== 'synthetic') return res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' });
      if (!syntheticEgovAvailable()) return res.status(503).json({ success: false, error: 'egov_unavailable', message: 'Authentication is unavailable' });
      const code = req.body?.exchange_code; const invitation = req.body?.invitation_token;
      const profile = exchangeSyntheticCode(code, config.mode);
      if (!profile || (invitation !== undefined && (typeof invitation !== 'string' || invitation.length > 500))) return res.status(400).json({ success: false, error: 'invalid_exchange', message: 'Authentication failed' });
      const session = await (dependencies.completeLogin ? (dependencies.completeLogin as (code: string, invitation: string | undefined, profile: SyntheticEgovProfile) => Promise<{ token: string; account: unknown } | null>)(code, invitation, profile) : completeEgovLogin(code, invitation, profile));
      if (!session) return res.status(400).json({ success: false, error: 'invalid_exchange', message: 'Authentication failed' });
      res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(session.token)}; ${cookieOptions}`);
      return res.status(201).json({ success: true, account: session.account });
    } catch (error) { return next(error); }
  });
  return router;
}
export default createEgovAuthRouter;
