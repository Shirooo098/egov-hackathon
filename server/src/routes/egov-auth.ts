import express from 'express';
import type { RuntimeConfig } from '../runtime/config.js';
import { requireSameOrigin } from '../middleware/origin.js';

export function createEgovAuthRouter(config: RuntimeConfig) {
  const router = express.Router();

  router.all(['/synthetic/exchange-code', '/synthetic', '/synthetic/*'], (_req, res) =>
    res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' })
  );

  router.post(['/exchange', '/callback'], requireSameOrigin, (_req, res) => {
    if (config.mode !== 'synthetic') {
      return res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' });
    }
    return res.status(503).json({ success: false, error: 'egov_unavailable', message: 'Authentication is unavailable' });
  });

  return router;
}
export default createEgovAuthRouter;
