import express from 'express';
const router = express.Router();
import { askLaws } from '../controllers/egovaiController.js';

router.post('/laws', askLaws);

export default router;
