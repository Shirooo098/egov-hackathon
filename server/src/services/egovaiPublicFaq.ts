/**
 * eBuhay - Official eGovAI Public FAQ Provider Client
 *
 * Implements the documented Ticket 05 / Ticket 06 success contract:
 * - Server-only credentials: EGOV_AI_BASE_URL and EGOV_ACCESS_CODE
 * - POST {base}/api/v1/egov/integration/token with { access_code }
 * - POST {base}/api/v1/egov/integration/ai_assistant/generate with Bearer token, { prompt, category: 'PH' }
 * - Only fixed curated public eBuhay-process FAQ choices allowed
 * - Strict type checks, no credential/token logging, sanitized HTTP 503 unavailable on error
 */

import { CapabilityDeferredError } from './eGovAIService.js';

export const PUBLIC_EGOVAI_CHOICES = [
  'How does eBuhay coordination work?',
  'What are the steps to become a donor?',
  'What are the steps to become a recipient?',
  'How can I contact the coordination team?',
] as const;

export type PublicEgovAIChoice = (typeof PUBLIC_EGOVAI_CHOICES)[number];

const ALLOWED_CHOICES_SET = new Set<string>(PUBLIC_EGOVAI_CHOICES);

export type EgovAIOptions = {
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  accessCode?: string;
  timeoutMs?: number;
  mode?: string;
};

export type PublicFaqResult = {
  success: true;
  data: string;
  informational: true;
};

export class EgovAIValidationError extends Error {
  readonly status = 400;
  constructor(message = 'Select a supported public process question') {
    super(message);
    this.name = 'EgovAIValidationError';
  }
}

function validateBaseUrl(rawUrl: string | undefined): URL {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    throw new CapabilityDeferredError('Official eGovAI base URL is not configured.');
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new CapabilityDeferredError('Official eGovAI base URL must be a valid URL.');
  }
  if (parsed.protocol !== 'https:') {
    throw new CapabilityDeferredError('Official eGovAI base URL must use HTTPS.');
  }
  if (parsed.username || parsed.password) {
    throw new CapabilityDeferredError('Official eGovAI base URL must not contain credentials.');
  }
  if (parsed.search || parsed.hash) {
    throw new CapabilityDeferredError('Official eGovAI base URL must not contain query or fragment.');
  }
  return parsed;
}

function resolveEndpoint(baseUrl: URL, endpointPath: string): URL {
  const cleanBase = baseUrl.toString().replace(/\/+$/, '');
  const cleanEndpoint = endpointPath.replace(/^\/+/, '');
  const target = new URL(`${cleanBase}/${cleanEndpoint}`);
  if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) {
    throw new CapabilityDeferredError('Invalid provider URL construction.');
  }
  return target;
}

export function publicFaqConfigured(): boolean {
  if (process.env.EBUHAY_MODE !== 'synthetic' || !process.env.EGOV_ACCESS_CODE?.trim()) return false;
  try { validateBaseUrl(process.env.EGOV_AI_BASE_URL); return true; }
  catch { return false; }
}

export async function askPublicFaq(
  prompt: unknown,
  category: unknown = 'PH',
  options: EgovAIOptions = {}
): Promise<PublicFaqResult> {
  // Input validation: recheck exact fixed FAQ allowlist and category
  if (typeof prompt !== 'string' || !ALLOWED_CHOICES_SET.has(prompt.trim())) {
    throw new EgovAIValidationError();
  }
  if (category !== undefined && category !== 'PH') {
    throw new EgovAIValidationError();
  }
  const cleanPrompt = prompt.trim();

  // Environment checks: require synthetic application mode, staging-only
  const appMode = options.mode ?? process.env.EBUHAY_MODE;
  if (appMode !== 'synthetic') {
    throw new CapabilityDeferredError('eGovAI public guidance is staging/synthetic only.');
  }

  // Base URL & access code
  const baseUrl = validateBaseUrl(options.baseUrl ?? process.env.EGOV_AI_BASE_URL);
  const accessCode = (options.accessCode ?? process.env.EGOV_ACCESS_CODE)?.trim();
  if (!accessCode) {
    throw new CapabilityDeferredError('Official eGovAI access code is not configured.');
  }

  const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0 ? options.timeoutMs : 10_000;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // 1. Token Exchange
    const tokenUrl = resolveEndpoint(baseUrl, '/api/v1/egov/integration/token');
    const tokenRes = await fetchImpl(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: accessCode }),
      redirect: 'error',
      signal: controller.signal,
    });

    if (!tokenRes.ok || tokenRes.status !== 200) {
      throw new CapabilityDeferredError();
    }

    const tokenBody = (await tokenRes.json()) as Record<string, unknown>;
    if (!tokenBody || typeof tokenBody !== 'object' || Array.isArray(tokenBody)) {
      throw new CapabilityDeferredError();
    }

    const { access_token, expires_in_seconds, credits_total, credits_remaining } = tokenBody;
    if (typeof access_token !== 'string' || !access_token.trim()) {
      throw new CapabilityDeferredError();
    }
    if (typeof expires_in_seconds !== 'number' || !Number.isFinite(expires_in_seconds) || expires_in_seconds <= 0) {
      throw new CapabilityDeferredError();
    }
    if (typeof credits_total !== 'number' || !Number.isFinite(credits_total) || credits_total < 0) {
      throw new CapabilityDeferredError();
    }
    if (typeof credits_remaining !== 'number' || !Number.isFinite(credits_remaining) || credits_remaining < 0) {
      throw new CapabilityDeferredError();
    }

    // 2. Inference / Assistant Generate
    const generateUrl = resolveEndpoint(baseUrl, '/api/v1/egov/integration/ai_assistant/generate');
    const generateRes = await fetchImpl(generateUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access_token.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: cleanPrompt, category: 'PH' }),
      redirect: 'error',
      signal: controller.signal,
    });

    if (!generateRes.ok || generateRes.status !== 200) {
      throw new CapabilityDeferredError();
    }

    const generateBody = (await generateRes.json()) as Record<string, unknown>;
    if (!generateBody || typeof generateBody !== 'object' || Array.isArray(generateBody)) {
      throw new CapabilityDeferredError();
    }

    const { data, session_id } = generateBody;
    if (typeof data !== 'string' || !data.trim()) {
      throw new CapabilityDeferredError();
    }
    if (typeof session_id !== 'string' || !session_id.trim()) {
      throw new CapabilityDeferredError();
    }
    if ([accessCode, access_token.trim(), session_id.trim()].some((secret) => data.includes(secret))) {
      throw new CapabilityDeferredError();
    }

    return {
      success: true,
      data: data.trim(),
      informational: true,
    };
  } catch (error) {
    if (error instanceof EgovAIValidationError) {
      throw error;
    }
    // All other unknown/malformed/timeout/non2xx/quota responses are sanitized to generic unavailable
    throw new CapabilityDeferredError('Official eGovAI service is currently unavailable. Please retry later.');
  } finally {
    clearTimeout(timer);
  }
}
