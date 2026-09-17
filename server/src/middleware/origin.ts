function allowedOrigins(configured?: string[]) {
  return configured ?? (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
}

function requireSameOrigin(req: Request, res: Response, next: NextFunction): void | Response {
  const origin = req.get('origin');
  const referer = req.get('referer');
  const origins = allowedOrigins((req as Request & { allowedOrigins?: string[] }).allowedOrigins);
  let refererOrigin: string | undefined;
  if (referer) { try { const parsed = new URL(referer); refererOrigin = `${parsed.protocol}//${parsed.host}`; } catch { refererOrigin = undefined; } }
  const valid = origin ? origins.includes(origin) : Boolean(refererOrigin && origins.includes(refererOrigin));
  if (!valid) return res.status(403).json({ success: false, message: 'Origin not allowed' });
  return next();
}

export { requireSameOrigin, allowedOrigins };
import type { Request, Response, NextFunction } from 'express';
