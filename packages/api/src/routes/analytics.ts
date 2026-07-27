import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const analyticsRouter = Router();
analyticsRouter.use(requireStore);
analyticsRouter.use(authenticate);

analyticsRouter.get('/summary', async (req: StoreRequest, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const [revenue, orders, products, customers] = await Promise.all([
      prisma.order.aggregate({ where: { storeId: req.storeId!, createdAt: { gte: periodStart, lte: periodEnd }, paymentStatus: 'PAID' }, _sum: { total: true } }),
      prisma.order.count({ where: { storeId: req.storeId!, createdAt: { gte: periodStart, lte: periodEnd } } }),
      prisma.product.count({ where: { storeId: req.storeId!, status: 'PUBLISHED' } }),
      prisma.order.groupBy({ by: ['customerId'], where: { storeId: req.storeId!, createdAt: { gte: periodStart, lte: periodEnd } }, _count: true }),
    ]);

    res.json({
      success: true,
      data: {
        totalRevenue: revenue._sum.total || 0,
        totalOrders: orders,
        totalProducts: products,
        totalCustomers: customers.length,
        averageOrderValue: orders > 0 ? (revenue._sum.total || 0) / orders : 0,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
    });
  } catch (error) { next(error); }
});

analyticsRouter.get('/revenue', async (req: StoreRequest, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days as string) || 30));
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: { storeId: req.storeId!, createdAt: { gte: startDate }, paymentStatus: 'PAID' },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenue: Record<string, number> = {};
    const weeklyRevenue: Record<string, number> = {};
    const monthlyRevenue: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      dailyRevenue[d.toISOString().split('T')[0]] = 0;
    }

    orders.forEach(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      if (dailyRevenue[date] !== undefined) dailyRevenue[date] += o.total;

      const week = getWeekKey(o.createdAt);
      weeklyRevenue[week] = (weeklyRevenue[week] || 0) + o.total;

      const month = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + o.total;
    });

    const weekly = Object.entries(weeklyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([week, revenue]) => ({ week, revenue }));
    const monthly = Object.entries(monthlyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, revenue]) => ({ month, revenue }));

    res.json({
      success: true,
      data: {
        daily: Object.entries(dailyRevenue).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue })),
        weekly,
        monthly,
        totals: {
          weekly: weekly.reduce((s, r) => s + r.revenue, 0),
          monthly: monthly.reduce((s, r) => s + r.revenue, 0),
          allTime: orders.reduce((s, o) => s + o.total, 0),
        },
      },
    });
  } catch (error) { next(error); }
});

analyticsRouter.get('/product-stats', async (req: StoreRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { storeId: req.storeId! },
      include: { category: true, _count: { select: { cartItems: true, orderItems: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const orderItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { product: { storeId: req.storeId! }, order: { paymentStatus: 'PAID' } },
      _sum: { totalPrice: true, quantity: true },
    });

    const revenueMap = new Map(orderItems.map(o => [o.productId, { revenue: o._sum.totalPrice || 0, unitsSold: o._sum.quantity || 0 }]));

    const data = products.map(p => ({
      id: p.id, name: p.name, slug: p.slug, sku: p.sku, brand: p.brand,
      price: p.price, stock: p.stock, status: p.status,
      category: p.category?.name || '',
      createdAt: p.createdAt,
      cartDemand: p._count.cartItems,
      orderCount: p._count.orderItems,
      unitsSold: revenueMap.get(p.id)?.unitsSold || 0,
      revenue: revenueMap.get(p.id)?.revenue || 0,
    }));

    res.json({ success: true, data });
  } catch (error) { next(error); }
});

function getWeekKey(d: Date): string {
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay());
  return `${start.getFullYear()}-W${String(Math.ceil((start.getTime() - new Date(start.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000))).padStart(2, '0')}`;
}
