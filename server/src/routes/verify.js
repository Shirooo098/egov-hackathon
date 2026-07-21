const express = require('express');
const router = express.Router();
const { initVerify, checkQR } = require('../controllers/verifyController');

router.post('/verify', initVerify);
router.post('/verify/qr', checkQR);

module.exports = router;
