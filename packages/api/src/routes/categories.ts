import { Router } from 'express';
import prisma from '@nexus/database';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const categoriesRouter = Router();
categoriesRouter.use(requireStore);

categoriesRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: null, storeId: req.storeId! },
      include: {
        children: { include: { _count: { select: { products: { where: { status: 'PUBLISHED', storeId: req.storeId! } } } } } },
        _count: { select: { products: { where: { status: 'PUBLISHED', storeId: req.storeId! } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: categories });
  } catch (error) { next(error); }
});

categoriesRouter.get('/:slug', async (req: StoreRequest, res, next) => {
  try {
    const category = await prisma.category.findFirst({
      where: { slug: req.params.slug, storeId: req.storeId! },
      include: { children: true, parent: true },
    });
    if (!category) return res.status(404).json({ success: false, error: 'Category not found' });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});
