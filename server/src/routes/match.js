const express = require('express');
const router = express.Router();
const { getMatches, getCompatibility, getMatrix } = require('../controllers/matchController');

router.get('/find', getMatches);
router.get('/compatibility/:blood_type', getCompatibility);
router.get('/matrix', getMatrix);

module.exports = router;
