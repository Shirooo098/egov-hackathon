console.log("✅ egov.ts loaded");

import express from 'express';

const router = express.Router();

const unavailable = (res: express.Response) =>
  res.status(404).json({ success: false, error: 'service_disabled', message: 'eGov integration is disabled' });

// POST /api/egov/token
router.post("/token", async (req, res) => {
  return unavailable(res);
});

// POST /api/egov/sso-authenticate
router.post("/sso-authenticate", async (req, res) => {
  return unavailable(res);
});

const capabilityDeferred = (res: express.Response, message: string) =>
  res.status(503).json({
    success: false,
    error: 'capability_deferred',
    code: 'capability_deferred',
    status: 'unavailable',
    message,
    retryable: true,
    retry_guidance: 'Official integration is unverified or deferred. Please retry later.',
  });

const PUBLIC_EGOVAI_CHOICES = new Set([
  'How does eBuhay coordination work?',
  'What are the steps to become a donor?',
  'What are the steps to become a recipient?',
  'How can I contact the coordination team?',
]);

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
  const { prompt } = req.body || {};
  if (typeof prompt !== 'string' || !PUBLIC_EGOVAI_CHOICES.has(prompt.trim())) {
    return res.status(400).json({ success: false, message: 'Select a supported public process question' });
  }
  return capabilityDeferred(
    res,
    "Official eGovAI public guidance is deferred pending verified contracts. Please retry later."
  );
});

router.get("/test", (req, res) => {
  res.json({ message: "eGov router is working" });
});

export default router;
