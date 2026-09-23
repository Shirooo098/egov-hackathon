import express from 'express';

const router = express.Router();

// Arbitrary public SMS relay is disabled. Notifications must use authenticated server workflows.
router.post('/sms/push', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'relay_disabled',
    message: 'Public SMS relay is disabled. Use authenticated notification workflows.',
  });
});

router.get('/test', (_req, res) => {
  res.json({ success: true, message: 'eMessage router is working' });
});

export default router;
