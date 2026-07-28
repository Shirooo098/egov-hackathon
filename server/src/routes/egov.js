console.log("✅ egov.js loaded");

const express = require("express");
const axios = require("axios");

const router = express.Router();

const BASE = process.env.EGOV_BASE_URL;
const PARTNER_CODE = process.env.EGOV_PARTNER_CODE;
const PARTNER_SECRET = process.env.EGOV_PARTNER_SECRET;

const FACE_BASE = process.env.FACE_LIVENESS_BASE_URL;
const FACE_LIVENESS_API_KEY = process.env.FACE_LIVENESS_API_KEY;


// ---- ADD near the top, alongside your other env vars ----
const EGOV_AI_BASE_URL = process.env.EGOV_AI_BASE_URL; // set this from your Postman "base" env var
const EGOV_ACCESS_CODE = process.env.EGOV_ACCESS_CODE;

// In-memory token cache. Fine for a single-instance hackathon server;
// if you ever run multiple instances, move this to redis/shared store.
let cachedAiToken = null;
let aiTokenExpiresAt = 0;

// POST /api/egov/token
router.post("/token", async (req, res) => {
  try {
    const { exchange_code } = req.body;

    const response = await axios.post(`${BASE}/api/token`, {
      exchange_code,
      scope: "SSO_AUTHENTICATION",
      partner_code: PARTNER_CODE,
      partner_secret: PARTNER_SECRET,
    });

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(err.response?.status || 500).json(
      err.response?.data || {
        message: err.message,
      }
    );
  }
});

// POST /api/egov/sso-authenticate
router.post("/sso-authenticate", async (req, res) => {
  try {
    const { access_token } = req.body;

    const response = await axios.post(
      `${BASE}/api/partner/sso_authentication`,
      {},
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error(err.response?.data || err.message);

    res.status(err.response?.status || 500).json(
      err.response?.data || {
        message: err.message,
      }
    );
  }
});


console.log("Face URL:", `${FACE_BASE}/v1/liveness/session`);
console.log("API Key Present:", !!FACE_LIVENESS_API_KEY);
// POST /api/egov/liveness/session
router.post("/liveness/session", async (req, res) => {
  try {
    const { action, callback_url, delay } = req.body;

    const response = await axios.post(
      `${FACE_BASE}/v1/liveness/session`,
      {
        action,
        callback_url,
        delay,
      },
      {
        headers: {
          "x-api-key": FACE_LIVENESS_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.status(response.status).json(response.data);

  } catch (err) {
    console.error("Status:", err.response?.status);
    console.error("Response:", err.response?.data);

    res.status(err.response?.status || 500).json(
        err.response?.data || {
        message: err.message,
        }
    );
    }
});

// GET /api/egov/liveness/result/:sessionToken
router.get("/liveness/result/:sessionToken", async (req, res) => {

  try {

    const { sessionToken } = req.params;

    const response = await axios.get(
      `${FACE_BASE}/v1/liveness/result/${sessionToken}`,
      {
        headers: {
          "x-api-key": FACE_LIVENESS_API_KEY,
        },
      }
    );

    res.status(response.status).json(response.data);

  } catch (err) {

    console.error("Get Liveness Result Error");

    console.error(err.response?.data || err.message);

    res.status(err.response?.status || 500).json(
      err.response?.data || {
        message: err.message,
      }
    );
  }

});



async function getAiAccessToken() {
  const now = Date.now();
  if (cachedAiToken && now < aiTokenExpiresAt) {
    return cachedAiToken;
  }

  const response = await axios.post(`${EGOV_AI_BASE_URL}/api/v1/egov/integration/token`, {
    access_code: EGOV_ACCESS_CODE,
  });

  const { access_token, expires_in_seconds } = response.data;
  cachedAiToken = access_token;
  // Refresh 60s before actual expiry so we never fire a request on a stale token.
  aiTokenExpiresAt = now + (expires_in_seconds - 60) * 1000;
  return cachedAiToken;
}
// ---- eBuhay context (prepended to every AI prompt) ----
const EBUHAY_CONTEXT = `
You are the AI assistant for eBuhay, a prototype Philippine organ and blood donation platform developed for the DICT eGov Hackathon.

eBuhay integrates eGov SSO, Face Liveness, AI-assisted donor-recipient matching, hospital approval, consultation scheduling, digital donation agreements, and secure in-app messaging.

Workflow:
1. User signs in via eGov SSO.
2. Identity is verified through Face Liveness.
3. User completes a donor or recipient profile.
4. The system matches compatible donors and recipients.
5. Hospital reviews and approves or rejects the match.
6. The recipient proposes a consultation schedule.
7. The donor confirms the schedule.
8. Both parties digitally sign a Donation Agreement.
9. Chat becomes available after both have signed.

Roles:
- Donor: registers, manages donation information, confirms schedules, signs agreements.
- Recipient: registers, submits medical information, receives matches, schedules consultations, signs agreements.
- Hospital: reviews medical records and approves or rejects matches.

This is a prototype. Hospital review, matching, blockchain, agreements, scheduling, and chat may be simulated for demonstration purposes.

Answer questions based on this workflow when they relate to eBuhay. For general Philippine healthcare, organ donation, or eGov services, provide factual information while clearly distinguishing real services from simulated platform features. Keep responses concise, accurate, and easy to understand.

User question:
`;

// POST /api/egov/ai/chat
router.post('/ai/chat', async (req, res) => {
  try {
    const { prompt, category = 'PH' } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ message: 'prompt is required' });
    }

    const token = await getAiAccessToken();

    const response = await axios.post(
      `${EGOV_AI_BASE_URL}/api/v1/egov/integration/ai_assistant/generate`,
      {
        prompt: EBUHAY_CONTEXT + prompt.trim(),
        category,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // response.data looks like: { data: "<answer text>", session_id: "..." }
    res.json(response.data);
  } catch (err) {
    if (err.response?.status === 401) {
      cachedAiToken = null;
    }
    console.error('AI Assistant Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json(
      err.response?.data || { message: err.message }
    );
  }
});

router.get("/test", (req, res) => {
  res.json({ message: "eGov router is working" });
});

module.exports = router;