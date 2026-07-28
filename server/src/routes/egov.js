console.log("✅ egov.js loaded");

const express = require("express");
const axios = require("axios");

const router = express.Router();

const BASE = process.env.EGOV_BASE_URL;
const PARTNER_CODE = process.env.EGOV_PARTNER_CODE;
const PARTNER_SECRET = process.env.EGOV_PARTNER_SECRET;

const FACE_BASE = process.env.FACE_LIVENESS_BASE_URL;
const FACE_LIVENESS_API_KEY = process.env.FACE_LIVENESS_API_KEY;

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

router.get("/test", (req, res) => {
  res.json({ message: "eGov router is working" });
});

module.exports = router;