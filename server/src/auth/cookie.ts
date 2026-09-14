import { SESSION_TTL_MS } from './service.js';
const secure = process.env.COOKIE_SECURE !== 'false' && !(process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_LOCAL === 'true');
const cookieOptions = `Path=/; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
const clearCookie = `Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
export { cookieOptions, clearCookie };
