const { anchorConsent, getTransactionReceipt, getChainInfo } = require('../services/BesuService');

async function anchor(req, res, next) {
  try {
    const { matchId, donorId, recipientId, donorSignature, recipientSignature } = req.body;
    if (!matchId || !donorId || !recipientId || !donorSignature || !recipientSignature) {
      return res.status(400).json({ success: false, message: 'matchId, donorId, recipientId, donorSignature, recipientSignature are required' });
    }
    const consentData = {
      matchId, donorId, recipientId, donorSignature, recipientSignature,
      timestamp: new Date().toISOString(),
      platform: 'eBuhay DICT eGov Platform'
    };
    const result = await anchorConsent(consentData);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function getReceipt(req, res, next) {
  try {
    const { txHash } = req.params;
    if (!txHash) return res.status(400).json({ success: false, message: 'txHash is required' });
    const result = await getTransactionReceipt(txHash);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

async function chainInfo(req, res, next) {
  try {
    const info = await getChainInfo();
    res.json({ success: true, data: info });
  } catch (err) { next(err); }
}

module.exports = { anchor, getReceipt, chainInfo };
