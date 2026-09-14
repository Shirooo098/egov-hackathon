import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import type { RuntimeConfig } from '../runtime/config.js';
import { SESSION_COOKIE } from '../auth/service.js';

export const CSRF_COOKIE = 'ebuhay_csrf';
const csrfHeader = 'x-csrf-token';
const bucketStores = new Set<Map<string, { started: number; count: number }>>();
const parseCookies = (raw: string | undefined): Record<string, string> => Object.fromEntries((raw ?? '').split(';').filter((part) => part.includes('=')).map((part) => {
  const i = part.indexOf('='); try { return [part.slice(0, i).trim(), decodeURIComponent(part.slice(i + 1).trim())]; } catch { return [part.slice(0, i).trim(), '']; }
}));
const token = () => crypto.randomBytes(32).toString('base64url');
const safeRequestId = (value: string | undefined): string => value && /^[A-Za-z0-9._:-]{1,100}$/.test(value) ? value : crypto.randomUUID();
const requestIdOf = (req: Request): string | undefined => (req as Request & { requestId?: string }).requestId;

export function requestCorrelation(req: Request, res: Response, next: NextFunction): void {
  const requestId = safeRequestId(req.get('x-request-id'));
  res.setHeader('x-request-id', requestId);
  (req as Request & { requestId: string }).requestId = requestId;
  next();
}

export function csrfToken(_req: Request, res: Response): void {
  const value = token();
  res.setHeader('set-cookie', `${CSRF_COOKIE}=${encodeURIComponent(value)}; Path=/; SameSite=Lax${process.env.COOKIE_SECURE !== 'false' ? '; Secure' : ''}`);
  res.json({ success: true, data: { csrfToken: value } });
}

export function createCsrfProtection(sessionCookie: string = SESSION_COOKIE) {
  return (req: Request, res: Response, next: NextFunction): void => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const cookies = parseCookies(req.get('cookie'));
  const cookieToken = cookies[CSRF_COOKIE];
  const headerToken = req.get(csrfHeader);
  // Cookie-authenticated mutations and endpoints that set cookies require the double submit token.
  const cookieMutation = Boolean(cookies[sessionCookie]) || req.path.startsWith('/auth/');
  if (!cookieMutation) return next();
  let matches = false;
  try { matches = Boolean(cookieToken && headerToken && cookieToken.length === headerToken.length && crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))); } catch { matches = false; }
  if (!matches) {
    res.status(403).json({ success: false, error: 'csrf_invalid', message: 'CSRF validation failed', requestId: requestIdOf(req) }); return;
  }
  next();
  };
}

export const csrfProtection = createCsrfProtection();

export function throttle(config: RuntimeConfig) {
  const buckets = new Map<string, { started: number; count: number }>(); bucketStores.add(buckets);
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now(); const windowMs = config.rateLimitWindowMs ?? 60_000; const max = config.rateLimitMax ?? 120;
    // Expiry eviction is deliberately bounded; the size cap protects against
    // unbounded churn from unique client/session identifiers.
    let evicted = 0;
    for (const [key, bucket] of buckets) {
      if (now - bucket.started >= windowMs) { buckets.delete(key); if (++evicted >= 100) break; }
    }
    while (buckets.size >= 10_000) buckets.delete(buckets.keys().next().value as string);
    const hit = (key: string): boolean => {
      const current = buckets.get(key);
      const bucket = !current || now - current.started >= windowMs ? { started: now, count: 0 } : current;
      bucket.count += 1; buckets.set(key, bucket);
      return bucket.count > max;
    };
    // The IP bucket is always enforced, even when callers rotate fake cookies.
    const ipKey = `ip:${req.ip || req.socket.remoteAddress || 'anonymous'}`;
    const session = parseCookies(req.get('cookie'))[SESSION_COOKIE];
    const sessionKey = session ? `session:${crypto.createHash('sha256').update(session).digest('hex').slice(0, 16)}` : undefined;
    if (hit(ipKey) || (sessionKey && hit(sessionKey))) { res.status(429).json({ success: false, error: 'rate_limited', message: 'Too many requests', requestId: requestIdOf(req) }); return; }
    next();
  };
}

export function resetThrottle(): void { for (const buckets of bucketStores) buckets.clear(); }

export function redactV1Response(req: Request, res: Response, next: NextFunction): void {
  const original = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 500) return original({ success: false, error: 'internal_error', message: 'Request failed', requestId: requestIdOf(req) });
    return original(body);
  }) as typeof res.json;
  next();
}

export function v1Cors(config: RuntimeConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    (req as Request & { allowedOrigins?: string[] }).allowedOrigins = config.allowedOrigins;
    const origin = req.get('origin');
    const origins = Array.isArray(config.allowedOrigins) ? config.allowedOrigins : [];
    if (origin && origins.includes(origin)) {
      res.setHeader('access-control-allow-origin', origin); res.setHeader('access-control-allow-credentials', 'true');
      res.setHeader('vary', 'Origin');
      if (req.method === 'OPTIONS') { res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS'); res.setHeader('access-control-allow-headers', 'content-type,x-csrf-token,x-request-id,authorization'); res.status(204).end(); return; }
    } else if (origin) { res.status(403).json({ success: false, error: 'origin_not_allowed', message: 'Origin not allowed', requestId: requestIdOf(req) }); return; }
    next();
  };
}
