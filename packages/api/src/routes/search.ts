import { Router } from 'express';
import prisma from '@nexus/database';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const searchRouter = Router();
searchRouter.use(requireStore);

searchRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    const q = req.query.q as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    if (!q) return res.json({ success: true, data: [], meta: { page: 1, limit, total: 0, totalPages: 0 } });

    const where: any = { status: 'PUBLISHED', storeId: req.storeId!, OR: [
      { name: { contains: q, mode: 'insensitive' as const } },
      { description: { contains: q, mode: 'insensitive' as const } },
      { brand: { contains: q, mode: 'insensitive' as const } },
      { tags: { has: q.toLowerCase() } },
    ]};

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: { category: true }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where }),
    ]);

    res.json({ success: true, data: products, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

searchRouter.get('/suggestions', async (req: StoreRequest, res, next) => {
  try {
    const q = req.query.q as string;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const products = await prisma.product.findMany({
      where: { storeId: req.storeId!, status: 'PUBLISHED', name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, slug: true, price: true }, take: 5,
    });
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
});
