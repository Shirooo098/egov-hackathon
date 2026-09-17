import type { Account } from './auth/service.js';

declare global {
  namespace Express {
    interface Request {
      account?: Account;
    }
  }
}

export {};
