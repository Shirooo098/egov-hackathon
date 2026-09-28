console.log("✅ egov.ts loaded");

import express from 'express';
import {
  askPublicFaq,
  PUBLIC_EGOVAI_CHOICES,
  EgovAIValidationError,
  type EgovAIOptions,
} from '../services/egovaiPublicFaq.js';

export type EgovRouterOptions = EgovAIOptions;

const unavailable = (res: express.Response) =>
  res.status(404).json({ success: false, error: 'service_disabled', message: 'eGov integration is disabled' });

const capabilityDeferred = (res: express.Response, message: string, code = 'capability_deferred') =>
  res.status(503).json({
    success: false,
    error: code,
    code,
    status: 'unavailable',
    message,
    retryable: true,
    retry_guidance: 'Please retry later.',
  });

const ALLOWED_CHOICES_SET = new Set<string>(PUBLIC_EGOVAI_CHOICES);

export function createEgovRouter(options: EgovRouterOptions = {}): express.Router {
  const router = express.Router();

  // POST /api/egov/token
  router.post("/token", async (_req, res) => {
    return unavailable(res);
  });

  // POST /api/egov/sso-authenticate
  router.post("/sso-authenticate", async (_req, res) => {
    return unavailable(res);
  });

  // POST /api/egov/liveness/session
  router.post("/liveness/session", async (_req, res) => {
    return capabilityDeferred(
      res,
      "Official Face Liveness session creation is deferred pending verified contracts. Please retry later."
    );
  });

  // GET /api/egov/liveness/result/:sessionToken
  router.get("/liveness/result/:sessionToken", async (_req, res) => {
    return capabilityDeferred(
      res,
      "Official Face Liveness verification is deferred pending verified contracts. Please retry later."
    );
  });

  // POST /api/egov/ai/chat
  router.post('/ai/chat', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ success: false, message: 'Select a supported public process question' });
    }

    const allowedKeys = new Set(['prompt', 'category']);
    if (Object.keys(body).some((k) => !allowedKeys.has(k))) {
      return res.status(400).json({ success: false, message: 'Select a supported public process question' });
    }

    const { prompt, category } = body;
    if (category !== undefined && category !== 'PH') {
      return res.status(400).json({ success: false, message: 'Select a supported public process question' });
    }

    if (typeof prompt !== 'string' || !ALLOWED_CHOICES_SET.has(prompt.trim())) {
      return res.status(400).json({ success: false, message: 'Select a supported public process question' });
    }

    try {
      const result = await askPublicFaq(prompt.trim(), category ?? 'PH', options);
      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof EgovAIValidationError) {
        return res.status(400).json({ success: false, message: error.message });
      }
      return capabilityDeferred(
        res,
        'Official eGovAI service is currently unavailable. Please retry later.',
        'provider_unavailable'
      );
    }
  });

  router.get("/test", (_req, res) => {
    res.json({ message: "eGov router is working" });
  });

  return router;
}

const defaultRouter = createEgovRouter();
export default defaultRouter;
