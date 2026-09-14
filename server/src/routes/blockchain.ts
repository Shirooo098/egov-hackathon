import express from 'express';
const router = express.Router();
import { anchor, getReceipt, chainInfo } from '../controllers/blockchainController.js';

router.post('/anchor', anchor);
router.get('/receipt/:txHash', getReceipt);
router.get('/chain-info', chainInfo);

export default router;
