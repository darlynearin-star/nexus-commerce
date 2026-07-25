import { Router } from 'express';
import prisma from '@nexus/database';
import { ProductStatus } from '@nexus/shared';
import { authenticate, optionalAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const productsRouter = Router();
productsRouter.use(requireStore);

productsRouter.get('/', optionalAuth, async (req: StoreRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const sort = (req.query.sort as string) || 'createdAt';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
    const search = req.query.search as string;
    const category = req.query.category as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);
    const brand = req.query.brand as string;
    const status = req.query.status as string;

    const where: any = { status: 'PUBLISHED', storeId: req.storeId! };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) where.category = { slug: category };
    if (brand) where.brand = brand;
    if (!isNaN(minPrice)) where.price = { ...where.price, gte: minPrice };
    if (!isNaN(maxPrice)) where.price = { ...where.price, lte: maxPrice };
    if (status && (req as any).user) where.status = status;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true, variants: true, reviews: { where: { isApproved: true }, take: 5, orderBy: { createdAt: 'desc' } } },
        skip: (page - 1) * limit, take: limit, orderBy: { [sort]: order },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ success: true, data: products, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

productsRouter.get('/:slug', optionalAuth, async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { slug: req.params.slug, storeId: req.storeId! },
      include: { category: true, variants: true, downloads: true, reviews: { where: { isApproved: true }, orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });

    const related = await prisma.product.findMany({
      where: { storeId: req.storeId!, categoryId: product.categoryId, id: { not: product.id }, status: 'PUBLISHED' },
      take: 6, orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { ...product, related } });
  } catch (error) { next(error); }
});

productsRouter.get('/featured/list', async (req: StoreRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { storeId: req.storeId!, isFeatured: true, status: 'PUBLISHED' },
      include: { category: true }, take: 8, orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
});

productsRouter.get('/new/list', async (req: StoreRequest, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { storeId: req.storeId!, isNew: true, status: 'PUBLISHED' },
      include: { category: true }, take: 8, orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
});

productsRouter.post('/', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.create({ data: { ...req.body, storeId: req.storeId!, status: req.body.status || 'DRAFT' } });
    logActivity({ userId: (req as any).user!.userId, action: 'product:created', resource: 'product', resourceId: product.id, req: req as any });
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

productsRouter.put('/:id', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: req.body });
    logActivity({ userId: (req as any).user!.userId, action: 'product:updated', resource: 'product', resourceId: product.id, details: { changes: Object.keys(req.body) }, req: req as any });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

productsRouter.delete('/:id', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    logActivity({ userId: (req as any).user!.userId, action: 'product:deleted', resource: 'product', resourceId: req.params.id, req: req as any });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) { next(error); }
});

productsRouter.post('/:id/duplicate', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    const original = await prisma.product.findUnique({ where: { id: req.params.id }, include: { variants: true } });
    if (!original) return res.status(404).json({ success: false, error: 'Product not found' });

    const { id, createdAt, updatedAt, variants, ...data } = original;
    const duplicate = await prisma.product.create({
      data: { ...data, name: `${data.name} (Copy)`, slug: `${data.slug}-copy`, sku: `${data.sku}-COPY`, status: 'DRAFT' },
    });
    if (variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map(v => ({
          productId: duplicate.id, name: v.name, sku: `${v.sku}-COPY`, price: v.price, stock: v.stock, options: v.options as any, image: v.image,
        })),
      });
    }
    res.status(201).json({ success: true, data: duplicate });
  } catch (error) { next(error); }
});
