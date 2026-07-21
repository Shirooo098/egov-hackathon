const eVerify = require('../services/eVerifyService');
const eMessage = require('../services/eMessageService');

async function initVerify(req, res, next) {
  try {
    const { first_name, last_name, birth_date, middle_name, suffix, face_liveness_session_id } = req.body;
    if (!first_name || !last_name || !birth_date) {
      return res.status(400).json({ success: false, message: 'first_name, last_name, birth_date are required' });
    }
    const result = await eVerify.verifyIdentity({ first_name, last_name, birth_date, middle_name, suffix, face_liveness_session_id });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function checkQR(req, res, next) {
  try {
    const { qr_value } = req.body;
    if (!qr_value) return res.status(400).json({ success: false, message: 'qr_value is required' });
    const result = await eVerify.decodeQR(qr_value);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = { initVerify, checkQR };
