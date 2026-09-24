import express from 'express';
import { requireSession } from '../middleware/auth.js';
import { requireSameOrigin } from '../middleware/origin.js';
const router = express.Router();
import { anchor, getReceipt } from '../controllers/blockchainController.js';

router.post('/anchor', requireSession, requireSameOrigin, anchor);
router.get('/receipt/:txHash', requireSession, getReceipt);

export default router;
