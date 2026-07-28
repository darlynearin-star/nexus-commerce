import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { logger } from '../utils/logger';
import { jijiCategories } from '../../database/src/jiji-categories';

export const categoriesRouter = Router();
categoriesRouter.use(requireStore);

export async function seedStoreCategories(storeId: string): Promise<number> {
  const existing = await prisma.category.count({ where: { storeId } });
  if (existing > 0) return 0;
  let created = 0;
  const usedSlugs = new Set<string>();
  async function createTree(tree: any[], parentId: string | null) {
    for (const node of tree) {
      let slug = node.slug;
      if (usedSlugs.has(slug)) { let n = 1; while (usedSlugs.has(`${slug}-${n}`)) n++; slug = `${slug}-${n}`; }
      usedSlugs.add(slug);
      const cat = await prisma.category.create({ data: { storeId, name: node.name, slug, description: '', parentId } });
      created++;
      if (node.children) await createTree(node.children, cat.id);
    }
  }
  await createTree(jijiCategories, null);
  logger.info(`Auto-seeded ${created} categories for store ${storeId}`);
  return created;
}

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
    const storeId = req.storeId!;
    const forceReseed = req.query.force === '1';
    if (forceReseed) {
      await prisma.category.deleteMany({ where: { storeId } });
    }
    let categories = await prisma.category.findMany({ where: { storeId }, orderBy: { name: 'asc' } });
    if (categories.length === 0) {
      const seeded = await seedStoreCategories(storeId);
      if (seeded > 0) categories = await prisma.category.findMany({ where: { storeId }, orderBy: { name: 'asc' } });
    }
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
