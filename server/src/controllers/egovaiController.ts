import type { Request, Response, NextFunction } from 'express';
import { askLawsAndRegulations, getCreditsRemaining } from '../services/eGovAIService.js';

async function askLaws(req: Request, res: Response, next: NextFunction) {
  try {
    const { prompt, category } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'prompt is required' });
    const result = await askLawsAndRegulations(prompt, category || 'PH');
    res.json({ success: true, data: result, creditsRemaining: getCreditsRemaining() });
  } catch (err) { next(err); }
}

export { askLaws };
