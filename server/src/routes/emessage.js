const express = require('express');
const axios = require('axios');

const router = express.Router();

const EMESSAGE_BASE_URL = process.env.EMESSAGE_BASE_URL; // https://ws-message.e.gov.ph
const EMESSAGE_API_TOKEN = process.env.EMESSAGE_API_TOKEN;

// POST /api/emessage/sms/push
// Body: { number: "+639XXXXXXXXX", message: "..." }
router.post('/sms/push', async (req, res) => {
  try {
    const { number, message } = req.body;

    if (!number || !message) {
      return res.status(400).json({ success: false, message: 'number and message are required' });
    }

    const response = await axios.post(
      `${EMESSAGE_BASE_URL}/messaging/v1/sms/push`,
      { number, message },
      {
        headers: {
          'X-EMESSAGE-Auth': EMESSAGE_API_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    // Normalize to the { success, data } shape the rest of the API uses
    res.status(201).json({ success: true, data: response.data.data });
  } catch (err) {
    console.error('eMessage SMS Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      success: false,
      message: err.response?.data?.message || err.message,
    });
  }
});

router.get('/test', (req, res) => {
  res.json({ success: true, message: 'eMessage router is working' });
});

module.exports = router;