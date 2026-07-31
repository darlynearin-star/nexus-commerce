import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const retailer = await prisma.retailer.findUnique({ where: { userId: req.user!.userId }, include: { subscription: { include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } } } } });
    if (!retailer) return res.status(404).json({ success: false, error: 'Retailer profile not found' });
    if (!retailer.subscription) {
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const subscription = await prisma.retailerSubscription.create({ data: { retailerId: retailer.id, trialEnd } });
      return res.json({ success: true, data: subscription });
    }
    const sub = retailer.subscription;
    if (sub.status === 'TRIAL' && sub.trialEnd < new Date()) {
      const updated = await prisma.retailerSubscription.update({ where: { id: sub.id }, data: { status: 'SUSPENDED' } });
      return res.json({ success: true, data: updated });
    }
    res.json({ success: true, data: sub });
  } catch (error) { next(error); }
});

subscriptionsRouter.post('/subscribe', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const retailer = await prisma.retailer.findUnique({ where: { userId: req.user!.userId }, include: { subscription: true } });
    if (!retailer) return res.status(404).json({ success: false, error: 'Retailer profile not found' });

    if (retailer.subscription?.status === 'ACTIVE') {
      return res.json({ success: true, data: retailer.subscription, message: 'Already active' });
    }

    const nextBilling = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const subscription = await prisma.retailerSubscription.upsert({
      where: { retailerId: retailer.id },
      create: { retailerId: retailer.id, status: 'ACTIVE', trialStart: new Date(), trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), nextBillingDate: nextBilling },
      update: { status: 'ACTIVE', nextBillingDate: nextBilling },
    });

    logActivity({ userId: req.user!.userId, action: 'subscription:activated', resource: 'subscription', resourceId: subscription.id, req: req as any });
    res.json({ success: true, data: subscription });
  } catch (error) { next(error); }
});

subscriptionsRouter.post('/cancel', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const retailer = await prisma.retailer.findUnique({ where: { userId: req.user!.userId } });
    if (!retailer) return res.status(404).json({ success: false, error: 'Retailer profile not found' });

    const subscription = await prisma.retailerSubscription.update({
      where: { retailerId: retailer.id },
      data: { status: 'CANCELLED' },
    });

    logActivity({ userId: req.user!.userId, action: 'subscription:cancelled', resource: 'subscription', resourceId: subscription.id, req: req as any });
    res.json({ success: true, data: subscription });
  } catch (error) { next(error); }
});

subscriptionsRouter.get('/all', authenticate, requireRole(UserRole.SUPER_DEVELOPER), async (_req: AuthRequest, res, next) => {
  try {
    const subscriptions = await prisma.retailerSubscription.findMany({ include: { retailer: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: subscriptions });
  } catch (error) { next(error); }
});
