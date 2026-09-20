import express from 'express';
const router = express.Router();
import { getMatches, getCompatibility, getMatrix } from '../controllers/matchController.js';

router.get('/find', getMatches);
router.get('/compatibility/:blood_type', getCompatibility);
router.get('/matrix', getMatrix);

export default router;
