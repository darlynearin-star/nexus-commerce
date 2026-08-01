import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { requireFeatureEnabled } from '../middleware/feature-flags';

export const reviewsRouter = Router();
reviewsRouter.use(requireStore);

reviewsRouter.get('/product/:productId', async (req: StoreRequest, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId, storeId: req.storeId!, isApproved: true },
      orderBy: { createdAt: 'desc' }, take: 20,
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
    const review = await prisma.review.create({
      data: { productId, rating: Math.max(1, Math.min(5, rating || 5)), title: title || '', content: content || '', images: images || [], storeId: req.storeId!, customerId: customer.id, isVerifiedPurchase: true },
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) { next(error); }
});
