import { SESSION_COOKIE, currentSession } from '../auth/service.js';
import type { Request, Response, NextFunction } from 'express';

function cookies(req: Request): Record<string, string> {
  return Object.fromEntries((req.get('cookie') || '').split(';').filter(Boolean).map((part: string) => {
    const index = part.indexOf('='); return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

async function requireSession(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  try {
    const account = await currentSession(cookies(req)[SESSION_COOKIE]);
    if (!account) return res.status(401).json({ success: false, message: 'Authentication required' });
    req.account = account;
    return next();
  } catch (error) { return next(error); }
}

const requireRole = (...roles: string[]) => (req: Request, res: Response, next: NextFunction): void => req.account && roles.includes(req.account.role) ? next() : void res.status(403).json({ success: false, message: 'Insufficient role' });
const requireScope = (...scopes: string[]) => (req: Request, res: Response, next: NextFunction): void => req.account?.serviceScope && scopes.every((scope) => req.account!.serviceScope!.includes(scope)) ? next() : void res.status(403).json({ success: false, message: 'Insufficient service scope' });

export { cookies, requireSession, requireRole, requireScope };
