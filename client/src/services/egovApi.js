/**
 * eBuhay - eGov SSO + Face Liveness client service
 *
 * IMPORTANT: partner_secret must never live in the browser. These calls hit
 * YOUR backend (/api/egov/*), which holds partner_secret / apiKey server-side
 * and proxies through to eGov's endpoints documented in the Postman collection:
 *   - POST /api/token                       (SSO: exchange_code -> access_token)
 *   - POST /api/partner/sso_authentication   (SSO: access_token -> profile)
 *   - POST /v1/liveness/session              (Liveness: create session -> url + token)
 *   - GET  /v1/liveness/result/:sessionToken (Liveness: poll for result)
 *
 * If you don't have a backend proxy yet, point BASE to your backend and add
 * these four routes there — do NOT call eGov directly from the browser with
 * partner_secret/x-api-key, they'd be exposed to anyone reading network tab.
 */

const BASE = '/api/egov';

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

async function getJSON(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const egovApi = {
  /**
   * STEP 1 of SSO: exchange the authorization code eGov handed back after
   * the user authenticates on their side, for an access_token.
   * Backend route should call POST {{base_url}}/api/token with
   * exchange_code, scope: 'SSO_AUTHENTICATION', partner_code, partner_secret.
   */
  async exchangeCodeForToken(exchangeCode) {
    return postJSON(`${BASE}/token`, { exchange_code: exchangeCode });
    // -> { access_token }
  },

  /**
   * STEP 2 of SSO: resolve the authenticated citizen's profile using the
   * bearer access_token. Backend route calls
   * POST {{base_url}}/api/partner/sso_authentication
   * with Authorization: Bearer {{access_token}}.
   */
  async ssoAuthenticate(accessToken) {
    return postJSON(`${BASE}/sso-authenticate`, { access_token: accessToken });
    // -> { status, message, data: { first_name, last_name, birth_date, signature, ... } }
  },

  /**
   * STEP 1 of Liveness: create a session. action:'redirect' opens a hosted
   * capture page; we use 'redirect' with a callback_url pointing back into
   * the app so the popup can close itself, and we poll the result endpoint
   * from here in parallel.
   */
  async createLivenessSession({ callbackUrl, delay = 3000 }) {
    return postJSON(`${BASE}/liveness/session`, {
      action: 'redirect',
      callback_url: callbackUrl,
      delay,
    });
    // -> { token, url }
  },

  /**
   * STEP 2 of Liveness: poll for the verification result using the session
   * token returned above. Recommended thresholds per docs:
   * status === 'SUCCEEDED' AND confidence_score >= 95.0
   */
  async getLivenessResult(sessionToken) {
    return getJSON(`${BASE}/liveness/result/${sessionToken}`);
    // -> { status, confidence_score, reference_image_url }
  },

  /**
   * Convenience: poll getLivenessResult until it resolves to a terminal
   * state (SUCCEEDED / FAILED) or the timeout elapses.
   */
  async pollLivenessResult(sessionToken, { intervalMs = 2000, timeoutMs = 90000 } = {}) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const result = await this.getLivenessResult(sessionToken);
        if (result.status === 'SUCCEEDED' || result.status === 'FAILED') {
          return result;
        }
      } catch (e) {
        // 404 while session is still pending is expected; keep polling
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error('Liveness verification timed out. Please try again.');
  },
};