import express from 'express';
const router = express.Router();
import { initVerify, checkQR } from '../controllers/verifyController.js';

router.post('/verify', initVerify);
router.post('/verify/qr', checkQR);

export default router;
