/**
 * eBuhay - DICT eVerify PhilSys Identity Verification Service
 *
 * Official eVerify contracts are deferred pending team assessment.
 * Runtime fails closed: no generated profiles, PCNs, PASS results, or mock tokens.
 * Provider doubles may exist only in directly injected automated tests.
 */

export type VerifyInput = {
  first_name: string;
  last_name: string;
  birth_date: string;
  middle_name?: string;
  suffix?: string;
  face_liveness_session_id?: string;
};

export class CapabilityDeferredError extends Error {
  status = 503;
  code = 'capability_deferred';
  retryable = true;
  retry_guidance = 'Official eVerify is deferred pending team assessment. Please retry later.';

  constructor(message = 'Official eVerify is deferred pending team assessment. Please retry later.') {
    super(message);
    this.name = 'CapabilityDeferredError';
  }
}

/**
 * Exchange client credentials for a Bearer access token
 */
export async function getAccessToken(): Promise<string | null> {
  throw new CapabilityDeferredError(
    'Official eVerify token exchange is deferred pending team assessment. Please retry later.'
  );
}

/**
 * Verify a citizen's identity via demographic data + face liveness
 */
export async function verifyIdentity(_input: VerifyInput): Promise<never> {
  throw new CapabilityDeferredError(
    'Official eVerify demographic verification is deferred pending team assessment. Please retry later.'
  );
}

/**
 * Decode a National ID QR code
 */
export async function decodeQR(_qrValue: string): Promise<never> {
  throw new CapabilityDeferredError(
    'Official eVerify QR decode is deferred pending team assessment. Please retry later.'
  );
}
