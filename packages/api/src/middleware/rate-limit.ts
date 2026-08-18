import { rateLimit } from 'express-rate-limit';
import { Request } from 'express';

// Global safety net applied to /api (generous — protects the free tier host).
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});

// Stricter limiter for auth endpoints (per IP).
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please try again later.' },
});

// Per-account login limiter: keyed by the submitted email so brute-forcing a
// single account is throttled regardless of IP.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = ((req.body as any)?.email || '').toString().toLowerCase().trim();
    return `login:${email || req.ip || 'unknown'}`;
  },
  message: { success: false, error: 'Too many login attempts for this account. Please try again later.' },
});