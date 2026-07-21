const { generateScheduleSlots } = require('../services/eGovAIService');

async function optimizeSchedule(req, res, next) {
  try {
    const { doctorAvailability, donorAvailability, recipientAvailability, urgencyLevel } = req.body;

    // Default demo availability windows if not provided
    const now = new Date();
    const defaultAvail = [
      { start: new Date(now.getTime() + 1 * 3600 * 1000).toISOString(), end: new Date(now.getTime() + 8 * 3600 * 1000).toISOString() },
      { start: new Date(now.getTime() + 25 * 3600 * 1000).toISOString(), end: new Date(now.getTime() + 32 * 3600 * 1000).toISOString() }
    ];

    const result = await generateScheduleSlots({
      doctorAvailability: doctorAvailability || defaultAvail,
      donorAvailability: donorAvailability || defaultAvail,
      recipientAvailability: recipientAvailability || defaultAvail,
      urgencyLevel: urgencyLevel || 'moderate'
    });

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = { optimizeSchedule };
