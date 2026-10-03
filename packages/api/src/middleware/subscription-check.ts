import { Response, NextFunction } from 'express';
import prisma from '@nexus/database';
import { AuthRequest } from './auth';

export async function requireActiveSubscription(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const storeId = (req as any).storeId as string | undefined;
    if (!storeId) return next();

    const store = await prisma.store.findUnique({ where: { id: storeId }, include: { owner: { include: { retailer: { include: { subscription: true } } } } } });
    if (!store || store.owner.role !== 'RETAILER') return next();

    const retailer = store.owner.retailer;
    if (!retailer) return next();
    if (!retailer.subscription) {
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await prisma.retailerSubscription.create({ data: { retailerId: retailer.id, trialEnd } });
      return next();
    }

    const sub = retailer.subscription;
    const expiredTrial = sub.status === 'TRIAL' && sub.trialEnd < new Date();
    const lapsed = sub.status === 'SUSPENDED' || sub.status === 'CANCELLED' || expiredTrial;
    const lapsedMessage = sub.status === 'CANCELLED'
      ? 'Store subscription has been cancelled.'
      : expiredTrial
        ? 'Trial period has ended. Please subscribe to continue selling.'
        : 'Store is suspended due to payment. Please renew your subscription.';

    if (!lapsed) return next();

    // Platform staff bypass subscription gating entirely.
    if (req.user && (req.user.role === 'DEVELOPER' || req.user.role === 'SUPER_DEVELOPER')) return next();

    // The store owner must keep an active subscription to operate the store.
    if (req.user && store.ownerId === req.user.userId) {
      return res.status(403).json({ success: false, error: lapsedMessage });
    }

    // Non-owner callers (customers) may always READ their data; only writes
    // (e.g. placing new orders) are blocked while the store is lapsed.
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    return res.status(403).json({ success: false, error: lapsedMessage });
  } catch (error) {
    next(error);
  }
}
