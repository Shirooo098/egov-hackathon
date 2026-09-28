/**
 * eBuhay - DICT eGovAI Service
 *
 * Official eGovAI contracts are not yet verified.
 * Runtime fails closed: no mock laws/regulations, no generated clinical/scheduling output.
 * Provider doubles may exist only in directly injected automated tests.
 */

export type Availability = Array<{ start: string; end: string }>;

export type ScheduleInput = {
  hospitalAvailability?: Availability;
  doctorAvailability?: Availability;
  donorAvailability?: Availability;
  recipientAvailability?: Availability;
  urgencyLevel?: 'critical' | 'urgent' | 'moderate';
};

export class CapabilityDeferredError extends Error {
  status = 503;
  code = 'capability_deferred';
  retryable = true;
  retry_guidance = 'Official eGovAI integration is unverified or deferred. Please retry later.';

  constructor(message = 'Official eGovAI is deferred pending contract verification. Please retry later.') {
    super(message);
    this.name = 'CapabilityDeferredError';
  }
}

/**
 * Get (or refresh) the eGovAI access token
 */
export async function getAIToken(): Promise<string | null> {
  throw new CapabilityDeferredError(
    'Official eGovAI token exchange is deferred pending contract verification. Please retry later.'
  );
}

/**
 * Ask eGovAI a question about Philippine health laws & organ donation regulations
 */
export async function askLawsAndRegulations(_prompt: string, _category = 'PH'): Promise<never> {
  throw new CapabilityDeferredError(
    'Official eGovAI public guidance is deferred pending contract verification. Please retry later.'
  );
}

/**
 * AI-assisted tri-party schedule optimization
 */
export async function generateScheduleSlots(_input: ScheduleInput): Promise<never> {
  throw new CapabilityDeferredError(
    'Official eGovAI scheduling optimization is unavailable. Clinical and scheduling outputs cannot be generated.'
  );
}

export { askPublicFaq, PUBLIC_EGOVAI_CHOICES, type PublicEgovAIChoice } from './egovaiPublicFaq.js';
