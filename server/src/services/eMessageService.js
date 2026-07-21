/**
 * eHealth - DICT eMessage SMS Notification Service
 * Sends SMS push notifications to citizens via DICT eMessage API
 */

const DEMO_MODE = process.env.EMESSAGE_API_TOKEN === 'dict_emessage_demo_token';

/**
 * Send an SMS message to a Philippine mobile number
 * @param {string} number - E.164 format e.g. +639090000000
 * @param {string} message - SMS message body
 */
async function sendSMS(number, message) {
  if (DEMO_MODE) {
    console.log(`[eMessage DEMO] SMS to ${number}: "${message}"`);
    return { success: true, demo: true, number, message };
  }

  const res = await fetch(`${process.env.EMESSAGE_API_URL}/sms/push`, {
    method: 'POST',
    headers: {
      'X-EMESSAGE-Auth': process.env.EMESSAGE_API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ number, message })
  });

  if (res.status === 400) throw new Error('eMessage: Bad request â€” check phone number format (E.164 required)');
  if (res.status === 422) throw new Error('eMessage: Unprocessable entity â€” invalid payload');
  if (!res.ok) throw new Error(`eMessage SMS failed (${res.status})`);

  return { success: true };
}

// === Pre-built SMS template helpers ===

async function notifyMatchFound(phone, donorName, matchType) {
  const msg = `[eHealth] A ${matchType} match has been found for you! Donor: ${donorName}. Log in to ehealth.e.gov.ph to view details and initiate contact.`;
  return sendSMS(phone, msg);
}

async function notifyAppointmentConfirmed(phone, dateTime, doctorName) {
  const msg = `[eHealth] Your consultation with Dr. ${doctorName} is confirmed on ${dateTime}. Please arrive 15 minutes early. Ref: ehealth.e.gov.ph`;
  return sendSMS(phone, msg);
}

async function notifyChatMessage(phone, senderName) {
  const msg = `[eHealth] You have a new message from ${senderName}. Log in to ehealth.e.gov.ph to reply.`;
  return sendSMS(phone, msg);
}

async function notifyConsentSigned(phone, role) {
  const msg = `[eHealth] Your consent agreement as ${role} has been digitally signed and anchored to the blockchain. Ref: ehealth.e.gov.ph`;
  return sendSMS(phone, msg);
}

module.exports = {
  sendSMS,
  notifyMatchFound,
  notifyAppointmentConfirmed,
  notifyChatMessage,
  notifyConsentSigned
};
