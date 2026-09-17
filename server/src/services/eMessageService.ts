/**
 * eBuhay - DICT eMessage SMS Notification Service
 * Sends SMS push notifications to citizens via DICT eMessage API.
 *
 * Truthful delivery: Failures are never reported as delivered.
 * Privacy & Redaction: Logs and return values never contain unmasked mobile numbers,
 * unredacted credentials, or raw upstream errors.
 */
import { isLegacyIntegrationDisabled } from '../runtime/config.js';

const DEMO_MODE = process.env.DEMO_MODE === 'true' || isLegacyIntegrationDisabled();

export type DemoMessage = {
  id: string;
  number: string;
  message: string;
  timestamp: string;
  status: 'delivered' | 'failed';
  delivery_time?: string;
};

export type SmsResult =
  | {
      success: true;
      message_id: string;
      status: 'delivered';
      number?: string;
      message?: string;
      timestamp?: string;
      _demo?: boolean;
    }
  | {
      success: false;
      error: string;
      status: 'failed';
      number?: string;
      _demo?: boolean;
    };

const demoMessageLog: DemoMessage[] = [];

let mockSmsHandler: ((number: string, message: string) => Promise<SmsResult>) | null = null;

export function setMockSmsHandler(handler: ((number: string, message: string) => Promise<SmsResult>) | null) {
  mockSmsHandler = handler;
}

export function resetMockSmsHandler() {
  mockSmsHandler = null;
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 6) return '***';
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}****${suffix}`;
}

export function redactErrorMessage(err: unknown): string {
  if (typeof err === 'string') {
    if (err.includes('400') || err.includes('bad request') || err.includes('invalid_number')) return 'invalid_number';
    if (err.includes('401') || err.includes('403') || err.includes('auth')) return 'unauthorized';
    if (err.includes('422') || err.includes('unprocessable')) return 'invalid_payload';
    if (err.includes('429') || err.includes('rate')) return 'rate_limited';
    if (err.includes('500') || err.includes('502') || err.includes('503') || err.includes('upstream')) return 'upstream_error';
    if (err.includes('ECONN') || err.includes('ETIMEDOUT') || err.includes('network') || err.includes('fetch failed')) return 'network_error';
    if (/^[a-z0-9_:-]{1,80}$/.test(err)) return err;
    return 'delivery_failed';
  }
  if (err instanceof Error) return redactErrorMessage(err.message);
  return 'delivery_failed';
}

function simulateDelay(minMs = 10, maxMs = 50): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

function generateMessageId(): string {
  return 'MSG-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}

/**
 * Send an SMS message to a Philippine mobile number
 * @param {string} number - E.164 format e.g. +639090000000
 * @param {string} message - Generic SMS message body
 */
export async function sendSMS(number: string, message: string): Promise<SmsResult> {
  if (!number || !/^\+[1-9]\d{7,14}$/.test(number)) {
    return {
      success: false,
      error: 'invalid_number',
      status: 'failed',
    };
  }

  if (mockSmsHandler) {
    return mockSmsHandler(number, message);
  }

  // Demo mode: mock delivery truthfully
  if (DEMO_MODE || !process.env.EMESSAGE_API_URL) {
    await simulateDelay();

    // Simulated test failure hook: numbers ending in 999 fail to test provider failure handling
    if (number.endsWith('999')) {
      return {
        success: false,
        error: 'simulated_provider_failure',
        status: 'failed',
        _demo: true,
      };
    }

    const msgId = generateMessageId();
    const demoEntry: DemoMessage = {
      id: msgId,
      number: maskPhoneNumber(number),
      message,
      timestamp: new Date().toISOString(),
      status: 'delivered',
      delivery_time: new Date(Date.now() + 1000).toISOString(),
    };

    demoMessageLog.push(demoEntry);

    return {
      success: true,
      message_id: msgId,
      status: 'delivered',
      timestamp: demoEntry.timestamp,
      _demo: true,
    };
  }

  // Real API call path
  try {
    const res = await fetch(`${process.env.EMESSAGE_API_URL}/sms/push`, {
      method: 'POST',
      headers: {
        'X-EMESSAGE-Auth': process.env.EMESSAGE_API_TOKEN || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, message }),
    });

    if (res.status === 400) return { success: false, error: 'invalid_number', status: 'failed' };
    if (res.status === 422) return { success: false, error: 'invalid_payload', status: 'failed' };
    if (!res.ok) return { success: false, error: 'upstream_error', status: 'failed' };

    const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }; message_id?: string };
    return {
      success: true,
      message_id: data?.data?.id || data?.message_id || generateMessageId(),
      status: 'delivered',
    };
  } catch (err: unknown) {
    const redacted = redactErrorMessage(err);
    return {
      success: false,
      error: redacted,
      status: 'failed',
    };
  }
}

// === Generic SMS template helpers (Zero-leak: no names, medical data, or sensitive specifics) ===

export const GENERIC_SMS_TEMPLATES: Record<string, string> = {
  coordination_update: '[eBuhay] You have a coordination update. Please sign in to ebuhay.e.gov.ph to review your case.',
  withdrawal_update: '[eBuhay] A case participation status was updated. Sign in to ebuhay.e.gov.ph to review.',
  appointment_scheduled: '[eBuhay] An appointment status has been updated. Please sign in to ebuhay.e.gov.ph to review.',
  team_message: '[eBuhay] You have a new coordination message from your care team. Sign in to ebuhay.e.gov.ph to reply.',
  action_required: '[eBuhay] Action is requested for your coordination record. Please sign in to ebuhay.e.gov.ph.',
  blood_request_update: '[eBuhay] A blood coordination update is available. Sign in to ebuhay.e.gov.ph to review.',
  match_update: '[eBuhay] A coordination match proposal status has changed. Sign in to ebuhay.e.gov.ph to review.',
  consent_recorded: '[eBuhay] A coordination consent action has been recorded. Sign in to ebuhay.e.gov.ph to review.',
};

export async function notifyMatchFound(phone: string, _donorName?: string, _matchType?: string) {
  return sendSMS(phone, GENERIC_SMS_TEMPLATES.match_update);
}

export async function notifyAppointmentConfirmed(phone: string, _dateTime?: string, _hospitalName?: string) {
  return sendSMS(phone, GENERIC_SMS_TEMPLATES.appointment_scheduled);
}

export async function notifyChatMessage(phone: string, _senderName?: string) {
  return sendSMS(phone, GENERIC_SMS_TEMPLATES.team_message);
}

export async function notifyAgreementFinalized(phone: string, _role?: string) {
  return sendSMS(phone, GENERIC_SMS_TEMPLATES.consent_recorded);
}

export const notifyConsentSigned = notifyAgreementFinalized;

export function getDemoMessages() {
  return [...demoMessageLog];
}

export function clearDemoMessages() {
  demoMessageLog.length = 0;
}

export { DEMO_MODE };
export default {
  sendSMS,
  maskPhoneNumber,
  redactErrorMessage,
  setMockSmsHandler,
  resetMockSmsHandler,
  notifyMatchFound,
  notifyAppointmentConfirmed,
  notifyChatMessage,
  notifyAgreementFinalized,
  notifyConsentSigned,
  getDemoMessages,
  clearDemoMessages,
  GENERIC_SMS_TEMPLATES,
  DEMO_MODE,
};
