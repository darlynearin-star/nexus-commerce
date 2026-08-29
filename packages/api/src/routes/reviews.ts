import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';
import { requireFeatureEnabled } from '../middleware/feature-flags';
import { cacheInvalidateStore } from '../utils/cache';
import { logActivity } from '../utils/activity-log';

export const reviewsRouter = Router();
reviewsRouter.use(requireStore);

reviewsRouter.get('/product/:productId', async (req: StoreRequest, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId, storeId: req.storeId!, isApproved: true },
      orderBy: { createdAt: 'desc' }, take: 20,
      include: { customer: { select: { user: { select: { firstName: true, lastName: true } } } } },
    });
    const stats = await prisma.review.groupBy({ by: ['rating'], where: { productId: req.params.productId, storeId: req.storeId!, isApproved: true }, _count: true });
    const avg = await prisma.review.aggregate({ where: { productId: req.params.productId, storeId: req.storeId!, isApproved: true }, _avg: { rating: true } });
    res.json({ success: true, data: { reviews, stats, averageRating: avg._avg.rating || 0, totalReviews: reviews.length } });
  } catch (error) { next(error); }
});

reviewsRouter.post('/', authenticate, requireFeatureEnabled('reviews'), async (req: StoreRequest, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
    if (!customer) return res.status(400).json({ success: false, error: 'Customer not found' });

    const { productId, rating, title, content, images } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });
    // L-verified: only mark as verified if the customer has a delivered order for this product
    const hasDeliveredOrder = await prisma.orderItem.findFirst({
      where: { productId, order: { customerId: customer.id, status: 'COMPLETED' } },
      select: { id: true },
    });
    const review = await prisma.review.create({
      data: { productId, rating: Math.max(1, Math.min(5, rating || 5)), title: title || '', content: content || '', images: images || [], storeId: req.storeId!, customerId: customer.id, isVerifiedPurchase: !!hasDeliveredOrder, isApproved: false },
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) { next(error); }
});

// Store-owner moderation. Reviews are created unapproved and filtered out of every
// public read (`isApproved: true` only), so without these endpoints they could
// never become visible on the storefront.
reviewsRouter.get('/', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const { status } = req.query;
    const where: any = { storeId: req.storeId! };
    if (status === 'pending') where.isApproved = false;
    else if (status === 'approved') where.isApproved = true;
    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, slug: true, shortCode: true } },
        customer: { select: { user: { select: { firstName: true, lastName: true, email: true } } } },
      },
    });
    res.json({ success: true, data: reviews });
  } catch (error) { next(error); }
});

reviewsRouter.put('/:id/approve', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const review = await prisma.review.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    const updated = await prisma.review.update({ where: { id: review.id }, data: { isApproved: true } });
    cacheInvalidateStore(req.store!.slug);
    logActivity({ userId: (req as any).user!.userId, action: 'review:approved', resource: 'review', resourceId: review.id, req: req as any });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

reviewsRouter.delete('/:id', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const review = await prisma.review.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!review) return res.status(404).json({ success: false, error: 'Review not found' });
    await prisma.review.delete({ where: { id: review.id } });
    cacheInvalidateStore(req.store!.slug);
    logActivity({ userId: (req as any).user!.userId, action: 'review:deleted', resource: 'review', resourceId: req.params.id, req: req as any });
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) { next(error); }
});
