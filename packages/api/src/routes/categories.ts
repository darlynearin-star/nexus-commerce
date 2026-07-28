import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const categoriesRouter = Router();
categoriesRouter.use(requireStore);

categoriesRouter.post('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { name, slug, description, image, parentId } = req.body;
    if (!name || !slug) return res.status(400).json({ success: false, error: 'name and slug are required' });
    const category = await prisma.category.create({ data: { name, slug, description: description || '', image: image || '', parentId: parentId || null, storeId: req.storeId! } });
    res.status(201).json({ success: true, data: category });
  } catch (error) { next(error); }
});

categoriesRouter.put('/:id', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { name, slug, description, image, parentId } = req.body;
    const category = await prisma.category.update({ where: { id: req.params.id }, data: { name, slug, description, image, parentId } });
    res.json({ success: true, data: category });
  } catch (error) { next(error); }
});

categoriesRouter.delete('/:id', authenticate, async (req: StoreRequest, res, next) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) { next(error); }
});

categoriesRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { storeId: req.storeId! },
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
