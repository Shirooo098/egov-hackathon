/**
 * eBuhay - DICT eVerify PhilSys Identity Verification Service
 * Handles token exchange and demographic verification via PhilSys
 */

// In-memory token cache (server-side only — never expose to client)
let tokenCache = { token: null, expiresAt: null };

/**
 * Exchange client credentials for a Bearer access token
 * POST /api/auth
 */
async function getAccessToken() {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (tokenCache.token && tokenCache.expiresAt && now < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  // Demo mode: return mock token when no real credentials are set
  if (process.env.EVERIFY_CLIENT_ID === 'dict_everify_demo_client_id') {
    tokenCache = {
      token: 'demo_everify_access_token_' + Date.now(),
      expiresAt: now + 3600 * 1000 // 1 hour
    };
    return tokenCache.token;
  }

  const res = await fetch(`${process.env.EVERIFY_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.EVERIFY_CLIENT_ID,
      client_secret: process.env.EVERIFY_CLIENT_SECRET
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`eVerify auth failed (${res.status}): ${err.message || 'Invalid credentials'}`);
  }

  const data = await res.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600) * 1000
  };

  return tokenCache.token;
}

/**
 * Verify a citizen's identity via demographic data + face liveness
 * POST /api/query
 */
async function verifyIdentity({ first_name, last_name, birth_date, middle_name, suffix, face_liveness_session_id }) {
  // Demo mode
  if (process.env.EVERIFY_CLIENT_ID === 'dict_everify_demo_client_id') {
    return {
      success: true,
      demo: true,
      profile: {
        first_name, last_name, middle_name: middle_name || '',
        birth_date,
        gender: 'Male',
        blood_type: 'O+',
        marital_status: 'Single',
        contact: { mobile: '+639171234567', email: 'citizen@example.ph' },
        address: {
          barangay: 'Barangay 1', municipality: 'Manila',
          province: 'Metro Manila', postal_code: '1000'
        }
      },
      meta: { tier_level: 'Tier I', result_grade: 'PASS' }
    };
  }

  const token = await getAccessToken();
  const res = await fetch(`${process.env.EVERIFY_API_URL}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ first_name, last_name, birth_date, middle_name, suffix, face_liveness_session_id })
  });

  if (res.status === 401) throw new Error('eVerify token expired — please retry');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`eVerify verification failed (${res.status}): ${err.message || 'Unknown error'}`);
  }

  return res.json();
}

/**
 * Decode a National ID QR code (without face liveness)
 * POST /api/query/qr/check
 */
async function decodeQR(qr_value) {
  if (process.env.EVERIFY_CLIENT_ID === 'dict_everify_demo_client_id') {
    return { success: true, demo: true, pcn: 'PCN-DEMO-000001', profile: { blood_type: 'O+' } };
  }

  const token = await getAccessToken();
  const res = await fetch(`${process.env.EVERIFY_API_URL}/query/qr/check`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ qr_value })
  });

  if (res.status === 422) throw new Error('Malformed QR value — please scan again');
  if (!res.ok) throw new Error(`QR decode failed (${res.status})`);

  return res.json();
}

module.exports = { getAccessToken, verifyIdentity, decodeQR };
