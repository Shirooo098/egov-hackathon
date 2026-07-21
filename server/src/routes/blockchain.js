const express = require('express');
const router = express.Router();
const { anchor, getReceipt, chainInfo } = require('../controllers/blockchainController');

router.post('/anchor', anchor);
router.get('/receipt/:txHash', getReceipt);
router.get('/chain-info', chainInfo);

module.exports = router;
