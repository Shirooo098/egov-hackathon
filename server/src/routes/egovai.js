const express = require('express');
const router = express.Router();
const { askLaws } = require('../controllers/egovaiController');

router.post('/laws', askLaws);

module.exports = router;
