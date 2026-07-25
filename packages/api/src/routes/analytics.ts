import { Router } from 'express';
import prisma from '@nexus/database';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const analyticsRouter = Router();
analyticsRouter.use(requireStore);

analyticsRouter.get('/summary', async (req: StoreRequest, res, next) => {
  try {
    const periodStart = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const periodEnd = req.query.end ? new Date(req.query.end as string) : new Date();

    const [revenue, orders, products] = await Promise.all([
      prisma.order.aggregate({ where: { storeId: req.storeId!, createdAt: { gte: periodStart, lte: periodEnd }, paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.order.count({ where: { storeId: req.storeId!, createdAt: { gte: periodStart, lte: periodEnd } } }),
      prisma.product.count({ where: { storeId: req.storeId!, status: 'PUBLISHED' } }),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: revenue._sum.total || 0,
        totalOrders: orders,
        totalProducts: products,
        averageOrderValue: orders > 0 ? (revenue._sum.total || 0) / orders : 0,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
    });
  } catch (error) { next(error); }
});

analyticsRouter.get('/revenue', async (req: StoreRequest, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: { storeId: req.storeId!, createdAt: { gte: startDate }, paymentStatus: 'PAID' },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenue: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      dailyRevenue[date] = 0;
    }
    orders.forEach(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      if (dailyRevenue[date] !== undefined) dailyRevenue[date] += o.total;
    });

    res.json({ success: true, data: Object.entries(dailyRevenue).map(([date, revenue]) => ({ date, revenue })) });
  } catch (error) { next(error); }
});
