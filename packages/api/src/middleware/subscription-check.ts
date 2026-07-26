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
    if (sub.status === 'SUSPENDED') {
      return res.status(403).json({ success: false, error: 'Store is suspended due to payment. Please renew your subscription.' });
    }
    if (sub.status === 'CANCELLED') {
      return res.status(403).json({ success: false, error: 'Store subscription has been cancelled.' });
    }
    if (sub.status === 'TRIAL' && sub.trialEnd < new Date()) {
      await prisma.retailerSubscription.update({ where: { id: sub.id }, data: { status: 'SUSPENDED' } });
      return res.status(403).json({ success: false, error: 'Trial period has ended. Please subscribe to continue selling.' });
    }

    next();
  } catch (error) {
    next(error);
  }
}
