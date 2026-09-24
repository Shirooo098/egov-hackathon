/**
 * eBuhay - DICT eMessage SMS Notification Service
 * Sends SMS push notifications to citizens via DICT eMessage API.
 *
 * Truthful delivery: Failures and unconfirmed deliveries are never reported as delivered.
 * Privacy & Redaction: Logs and return values never contain unmasked mobile numbers,
 * unredacted credentials, or raw upstream errors.
 */
export type SmsResult =
  | {
      success: true;
      message_id?: string;
      status: 'accepted' | 'delivered' | 'sent';
      accepted?: boolean;
      number?: string;
      message?: string;
      timestamp?: string;
      _demo?: boolean;
    }
  | {
      success: false;
      error: string;
      status: 'failed' | 'unavailable';
      number?: string;
      _demo?: boolean;
    };

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

const KNOWN_SAFE_CLASSIFICATIONS = new Set([
  'invalid_number',
  'invalid_payload',
  'unauthorized',
  'rate_limited',
  'upstream_error',
  'network_error',
  'provider_timeout',
  'provider_unavailable',
  'delivery_unconfirmed',
  'delivery_failed',
  'disallowed_purpose',
  'audit_context_required',
  'consent_revoked',
  'max_attempts_exceeded',
]);

export function redactErrorMessage(err: unknown): string {
  if (typeof err === 'string') {
    if (err.includes('400') || err.includes('bad request') || err.includes('invalid_number')) return 'invalid_number';
    if (err.includes('401') || err.includes('403') || err.includes('auth')) return 'unauthorized';
    if (err.includes('422') || err.includes('unprocessable')) return 'invalid_payload';
    if (err.includes('429') || err.includes('rate')) return 'rate_limited';
    if (err.includes('500') || err.includes('502') || err.includes('503') || err.includes('upstream')) return 'upstream_error';
    if (err.includes('ECONN') || err.includes('ETIMEDOUT') || err.includes('network') || err.includes('fetch failed')) return 'network_error';
    if (KNOWN_SAFE_CLASSIFICATIONS.has(err)) return err;
    return 'delivery_failed';
  }
  if (err instanceof Error) return redactErrorMessage(err.message);
  return 'delivery_failed';
}

/**
 * Send an SMS message to a Philippine mobile number via official eMessage provider.
 * Simulated and network-failure success are removed; if official delivery cannot be confirmed,
 * unavailable is returned truthfully.
 *
 * @param {string} number - E.164 format e.g. +639090000000
 * @param {string} message - Generic SMS message body
 */
export async function sendSMS(
  number: string,
  message: string,
  dependencies: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<SmsResult> {
  if (!number || !/^\+[1-9]\d{7,14}$/.test(number)) {
    return {
      success: false,
      error: 'invalid_number',
      status: 'failed',
    };
  }

  if (mockSmsHandler) {
    const mockRes = await mockSmsHandler(number, message);
    if (mockRes.success) {
      if (mockRes.status === 'accepted') return { ...mockRes, accepted: true };
      if (!mockRes.message_id || (mockRes.status !== 'sent' && mockRes.status !== 'delivered')) {
        return {
          success: false,
          error: 'delivery_unconfirmed',
          status: 'unavailable',
        };
      }
    }
    return mockRes;
  }

  // Official provider configuration check:
  // Provider mocks are test-only. Without a configured official provider, delivery cannot be confirmed;
  // return unavailable truthfully without simulating success.
  const baseUrl = process.env.EMESSAGE_BASE_URL?.trim();
  const apiToken = process.env.EMESSAGE_API_TOKEN?.trim();
  let providerUrl: URL | null = null;
  try {
    providerUrl = baseUrl ? new URL(baseUrl) : null;
  } catch {
    providerUrl = null;
  }
  if (!providerUrl || providerUrl.protocol !== 'https:' || !apiToken) {
    return {
      success: false,
      error: 'provider_unavailable',
      status: 'unavailable',
    };
  }

  // Official provider call path
  try {
    const res = await (dependencies.fetchImpl ?? fetch)(`${providerUrl.toString().replace(/\/$/, '')}/messaging/v1/sms/push`, {
      method: 'POST',
      signal: AbortSignal.timeout(dependencies.timeoutMs ?? 10_000),
      headers: {
        'X-EMESSAGE-Auth': apiToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number, message }),
    });

    if (res.status === 400) return { success: false, error: 'invalid_number', status: 'failed' };
    if (res.status === 422) return { success: false, error: 'invalid_payload', status: 'failed' };
    if (res.status === 401 || res.status === 403) return { success: false, error: 'unauthorized', status: 'failed' };
    if (res.status === 429) return { success: false, error: 'rate_limited', status: 'failed' };
    if (res.status >= 500) return { success: false, error: 'provider_unavailable', status: 'unavailable' };
    if (res.status !== 201) {
      return { success: false, error: 'upstream_error', status: 'failed' };
    }

    return { success: true, accepted: true, status: 'accepted' };
  } catch (err: unknown) {
    const redacted =
      err instanceof DOMException && err.name === 'TimeoutError'
        ? 'provider_timeout'
        : redactErrorMessage(err);
    return {
      success: false,
      error: redacted,
      status: 'unavailable',
    };
  }
}

// === Generic SMS template helpers (Zero-leak: no names, medical data, or sensitive specifics) ===

export const GENERIC_SMS_TEMPLATES: Record<string, string> = {
  application_status_update: '[eBuhay] Your application status has changed. Open eBuhay in eGovPH to review.',
  appointment_scheduled: '[eBuhay] An appointment status has been updated. Open eBuhay in eGovPH to review.',
  action_required: '[eBuhay] A document action is requested. Open eBuhay in eGovPH to review.',
};
export default {
  sendSMS,
  maskPhoneNumber,
  redactErrorMessage,
  setMockSmsHandler,
  resetMockSmsHandler,
  GENERIC_SMS_TEMPLATES,
};
