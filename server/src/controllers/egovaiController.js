const { askLawsAndRegulations, getCreditsRemaining } = require('../services/eGovAIService');

async function askLaws(req, res, next) {
  try {
    const { prompt, category } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'prompt is required' });
    const result = await askLawsAndRegulations(prompt, category || 'PH');
    res.json({ success: true, data: result, creditsRemaining: getCreditsRemaining() });
  } catch (err) { next(err); }
}

module.exports = { askLaws };
