export type EgovProviderConfig = {
  baseUrl?: string;
  partnerCode?: string;
  partnerSecret?: string;
};

export type EgovIdentity = { uniqid: string; displayName: string; mobile?: string };
export type ProviderFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export class EgovProviderError extends Error {
  constructor(public readonly code: 'unavailable' | 'invalid_response' | 'not_configured') {
    super(code);
    this.name = 'EgovProviderError';
  }
}

function configUrl(value: string | undefined): URL {
  try {
    const url = new URL(value ?? '');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
    return new URL(url.toString().endsWith('/') ? url.toString() : `${url.toString()}/`);
  } catch {
    throw new EgovProviderError('not_configured');
  }
}

async function json(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new EgovProviderError('unavailable');
  try {
    const value = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new EgovProviderError('invalid_response');
  }
}

export async function verifyEgovExchange(
  config: EgovProviderConfig,
  exchangeCode: string,
  fetchImpl: ProviderFetch = fetch,
): Promise<EgovIdentity> {
  if (!config.partnerCode || !config.partnerSecret || !exchangeCode) throw new EgovProviderError('not_configured');
  const base = configUrl(config.baseUrl);
  const request = async (path: string, init: RequestInit) => {
    try { return await fetchImpl(new URL(path, base), { ...init, signal: AbortSignal.timeout(10_000) }); }
    catch { throw new EgovProviderError('unavailable'); }
  };
  const tokenResponse = await request('api/token', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ partner_code: config.partnerCode, partner_secret: config.partnerSecret, exchange_code: exchangeCode, scope: 'SSO_AUTHENTICATION' }),
  });
  if (tokenResponse.status !== 200) throw new EgovProviderError('unavailable');
  const token = await json(tokenResponse);
  if (typeof token.access_token !== 'string' || !token.access_token) throw new EgovProviderError('invalid_response');
  const profileResponse = await request('api/partner/sso_authentication', {
    method: 'POST', headers: { authorization: `Bearer ${token.access_token}`, 'content-type': 'application/json' }, body: '{}',
  });
  if (profileResponse.status !== 200) throw new EgovProviderError('unavailable');
  const profile = await json(profileResponse);
  if (profile.status !== 200 || !profile.data || typeof profile.data !== 'object' || Array.isArray(profile.data)) throw new EgovProviderError('invalid_response');
  const data = profile.data as Record<string, unknown>;
  if (typeof data.uniqid !== 'string' || !data.uniqid.trim() || data.uniqid.length > 200 || /[\x00-\x1f\x7f]/.test(data.uniqid)) throw new EgovProviderError('invalid_response');
  const first = typeof data.first_name === 'string' ? data.first_name.trim() : '';
  const last = typeof data.last_name === 'string' ? data.last_name.trim() : '';
  if (!first || !last || first.length > 100 || last.length > 100) throw new EgovProviderError('invalid_response');
  const mobile = typeof data.mobile === 'string' && /^\+[1-9]\d{7,14}$/.test(data.mobile.trim()) ? data.mobile.trim() : undefined;
  return { uniqid: data.uniqid, displayName: `${first} ${last}`, ...(mobile ? { mobile } : {}) };
}
