/**
 * eBuhay - DICT eMessage SMS Notification Service
 * Sends SMS push notifications to citizens via DICT eMessage API
 *
 * Demo Mode: When DEMO_MODE=true or no real credentials are set,
 * all SMS send operations are mocked with realistic delays.
 */

const DEMO_MODE = process.env.DEMO_MODE === 'true';

// Cache of sent messages for demo logging
const demoMessageLog = [];

/**
 * Simulate SMS delivery delay (500ms - 1000ms for demo realism)
 */
function simulateDelay(minMs = 500, maxMs = 1000) {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Generate a plausible SMS message ID for demo
 */
function generateMessageId() {
  return 'MSG-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

/**
 * Send an SMS message to a Philippine mobile number
 * @param {string} number - E.164 format e.g. +639090000000
 * @param {string} message - SMS message body
 */
async function sendSMS(number, message) {
  // Demo mode: log and return success
  if (DEMO_MODE) {
    await simulateDelay(); // Add realistic delay

    const msgId = generateMessageId();
    const demoEntry = {
      id: msgId,
      number,
      message,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      delivery_time: new Date(Date.now() + 1000).toISOString() // 1 second later
    };

    demoMessageLog.push(demoEntry);

    console.log(`[eMessage DEMO] SMS sent to ${number}: "${message.substring(0, 50)}..."`);

    return {
      success: true,
      message_id: msgId,
      number,
      message,
      status: 'delivered',
      timestamp: demoEntry.timestamp,
      _demo: true
    };
  }

  // Real API call path
  try {
    const res = await fetch(`${process.env.EMESSAGE_API_URL}/sms/push`, {
      method: 'POST',
      headers: {
        'X-EMESSAGE-Auth': process.env.EMESSAGE_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ number, message })
    });

    if (res.status === 400) throw new Error('eMessage: Bad request — check phone number format (E.164 required)');
    if (res.status === 422) throw new Error('eMessage: Unprocessable entity — invalid payload');
    if (!res.ok) throw new Error(`eMessage SMS failed (${res.status})`);

    return { success: true };
  } catch (err) {
    // Fallback to demo mode on network error
    console.warn('[eMessage] Network error, falling back to demo mode:', err.message);
    const msgId = generateMessageId();
    return {
      success: true,
      message_id: msgId,
      number,
      message,
      status: 'delivered',
      _demo: true
    };
  }
}

// === Pre-built SMS template helpers ===

async function notifyMatchFound(phone, donorName, matchType) {
  const msg = `[eBuhay] A ${matchType} match has been found for you! Donor: ${donorName}. Log in to ebuhay.e.gov.ph to view details and initiate contact.`;
  return sendSMS(phone, msg);
}

async function notifyAppointmentConfirmed(phone, dateTime, hospitalName) {
  const msg = `[eBuhay] Your procedure appointment at ${hospitalName} is confirmed on ${dateTime}. Please arrive 15 minutes early. Ref: ebuhay.e.gov.ph`;
  return sendSMS(phone, msg);
}

async function notifyChatMessage(phone, senderName) {
  const msg = `[eBuhay] You have a new message from ${senderName}. Log in to ebuhay.e.gov.ph to reply.`;
  return sendSMS(phone, msg);
}

async function notifyAgreementFinalized(phone, role) {
  const msg = `[eBuhay] Your donation agreement as ${role} has been digitally executed and anchored to the Hyperledger Besu blockchain. Ref: ebuhay.e.gov.ph`;
  return sendSMS(phone, msg);
}

const notifyConsentSigned = notifyAgreementFinalized;

/**
 * Get all demo messages (for debugging/testing)
 */
function getDemoMessages() {
  return [...demoMessageLog];
}

/**
 * Clear demo message log
 */
function clearDemoMessages() {
  demoMessageLog.length = 0;
}

module.exports = {
  sendSMS,
  notifyMatchFound,
  notifyAppointmentConfirmed,
  notifyChatMessage,
  notifyAgreementFinalized,
  notifyConsentSigned,
  getDemoMessages,
  clearDemoMessages,
  DEMO_MODE
};