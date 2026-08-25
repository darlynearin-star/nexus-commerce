import prisma from '@nexus/database';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// M-killswitch fix, two halves:
//
// 1. CU burn: this middleware ran on EVERY /api request and hit the database
//    each time. A 15s in-memory cache cuts that to ~4 queries/minute for the
//    whole platform. The kill switch is an emergency lever — a few seconds of
//    propagation delay is acceptable; per-request DB load was not.
// 2. Fail behavior: on query ERROR we now serve the last-known state (stale)
//    instead of silently failing open. Only when we have never read a state
//    do we fail open — and loudly.

const TTL_MS = process.env.NODE_ENV === 'test' ? 0 : 15_000;

let cachedState: any = null;
let cacheExpiresAt = 0;

export function invalidateKillSwitchCache(): void {
  cacheExpiresAt = 0;
}

async function loadState(): Promise<any> {
  if (TTL_MS > 0 && cachedState !== null && cacheExpiresAt > Date.now()) return cachedState;
  try {
    const state = await prisma.killSwitch.findFirst();
    cachedState = state;
    cacheExpiresAt = Date.now() + TTL_MS;
    return state;
  } catch (e: any) {
    if (cachedState !== null) {
      logger.warn(`Kill switch: DB read failed, serving last-known state (${e?.message || e})`);
      return cachedState;
    }
    logger.warn(`Kill switch: DB read failed before any state was known — failing open (${e?.message || e})`);
    return null;
  }
}

export async function checkKillSwitch(req: Request, res: Response, next: NextFunction) {
  try {
    const killSwitch = await loadState();
    if (!killSwitch) return next();

    if (killSwitch.apis) {
      return res.status(503).json({
        success: false,
        error: killSwitch.maintenanceMessage || 'Service temporarily unavailable',
        maintenance: true,
      });
    }

    if (killSwitch.maintenance && !req.path.startsWith('/api/auth')) {
      return res.status(503).json({
        success: false,
        error: killSwitch.maintenanceMessage || 'We are currently undergoing maintenance.',
        maintenance: true,
      });
    }

    if (killSwitch.retailerDashboard && req.path.startsWith('/api/stores/mine')) {
      return res.status(503).json({ success: false, error: 'Retailer dashboard is disabled.', maintenance: true });
    }

    if (killSwitch.customerRegistration && req.method === 'POST' && req.path.startsWith('/api/auth/register')) {
      return res.status(503).json({ success: false, error: 'Customer registration is disabled.', maintenance: true });
    }

    if (killSwitch.orders && req.path.startsWith('/api/orders')) {
      return res.status(503).json({ success: false, error: 'Order processing is disabled.', maintenance: true });
    }

    if (killSwitch.storefront && req.path.startsWith('/api/products')) {
      return res.status(503).json({ success: false, error: 'Storefront is disabled.', maintenance: true });
    }

    if (killSwitch.checkout && (req.path.startsWith('/api/orders') || req.path.startsWith('/api/cart'))) {
      return res.status(503).json({ success: false, error: 'Checkout is disabled.', maintenance: true });
    }

    if (
      killSwitch.payments &&
      (req.path.startsWith('/api/payments/charge') ||
        req.path.startsWith('/api/payments/verify') ||
        req.path.startsWith('/api/subscriptions/subscribe') ||
        req.path.startsWith('/api/subscriptions/verify') ||
        req.path.startsWith('/api/subscriptions/cancel'))
    ) {
      return res.status(503).json({ success: false, error: 'Payments are disabled.', maintenance: true });
    }

    if (killSwitch.search && req.path.startsWith('/api/search')) {
      return res.status(503).json({ success: false, error: 'Search is disabled.', maintenance: true });
    }

    if (killSwitch.uploads && (req.method === 'POST' || req.method === 'PUT') && (req.path.startsWith('/api/media') || req.path.startsWith('/api/upload'))) {
      return res.status(503).json({ success: false, error: 'Uploads are disabled.', maintenance: true });
    }

    next();
  } catch (e: any) {
    logger.warn(`Kill switch middleware error: ${e?.message || e}`);
    next();
  }
}
