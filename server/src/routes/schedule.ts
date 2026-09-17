import express from 'express';
const router = express.Router();
import { optimizeSchedule } from '../controllers/scheduleController.js';

router.post('/ai-optimize', optimizeSchedule);

export default router;
