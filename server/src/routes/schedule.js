const express = require('express');
const router = express.Router();
const { optimizeSchedule } = require('../controllers/scheduleController');

router.post('/ai-optimize', optimizeSchedule);

module.exports = router;
