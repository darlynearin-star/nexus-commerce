import { Router } from 'express';
import crypto from 'crypto';
import prisma from '@nexus/database';
import { ProductStatus } from '@nexus/shared';
import { authenticate, optionalAuth, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema, createVariantSchema, updateVariantSchema, bulkVariantsSchema } from '../validation/product';

function generateShortCode(): string {
  return crypto.randomBytes(5).toString('base64url').slice(0, 8);
}

async function getCategoryDescendantIds(storeId: string, categoryId: string): Promise<string[]> {
  const allCats = await prisma.category.findMany({ where: { storeId } });
  const childMap = new Map<string, string[]>();
  for (const c of allCats) {
    if (c.parentId) {
      if (!childMap.has(c.parentId)) childMap.set(c.parentId, []);
      childMap.get(c.parentId)!.push(c.id);
    }
  }
  const descendantIds: string[] = [categoryId];
  const queue = [categoryId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const kids = childMap.get(id) || [];
    for (const kid of kids) { descendantIds.push(kid); queue.push(kid); }
  }
  return descendantIds;
}

export const productsRouter = Router();

// Short-link redirect: no store context needed
const STOREFRONT_URL = process.env.STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';
productsRouter.get('/s/:code', async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { shortCode: req.params.code }, include: { store: true } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const productUrl = `/store/${product.store.slug}/product/${product.slug}`;
    const fullUrl = `${STOREFRONT_URL}${productUrl}`;
    const accept = req.headers.accept || '';
    if (accept.includes('text/html')) {
      return res.redirect(302, fullUrl);
    }
    return res.json({ success: true, data: { url: productUrl, fullUrl, storeSlug: product.store.slug, productSlug: product.slug } });
  } catch (error) { next(error); }
});

productsRouter.use(requireStore);

productsRouter.get('/', optionalAuth, async (req: StoreRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const sort = (req.query.sort as string) || 'createdAt';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';
    const search = req.query.search as string;
    const category = req.query.category as string;
    const parent = req.query.parent as string;
    const minPrice = parseFloat(req.query.minPrice as string);
    const maxPrice = parseFloat(req.query.maxPrice as string);
    const brand = req.query.brand as string;
    const status = req.query.status as string;

    const where: any = { storeId: req.storeId! };
    if (!(req as any).user) {
      where.status = 'PUBLISHED';
    } else if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (category) {
      const cat = await prisma.category.findFirst({ where: { slug: category, storeId: req.storeId! } });
      if (cat) {
        where.categoryId = { in: await getCategoryDescendantIds(req.storeId!, cat.id) };
      }
    }
    if (parent) {
      const parentCat = await prisma.category.findFirst({ where: { slug: parent, storeId: req.storeId! } });
      if (parentCat) {
        where.categoryId = { in: await getCategoryDescendantIds(req.storeId!, parentCat.id) };
      }
    }
    if (brand) where.brand = brand;
    if (!isNaN(minPrice)) where.price = { ...where.price, gte: minPrice };
    if (!isNaN(maxPrice)) where.price = { ...where.price, lte: maxPrice };
    const specFilters: any[] = [];
    for (const key of Object.keys(req.query)) {
      if (key.startsWith('spec_')) {
        const specKey = key.slice(5);
        const val = req.query[key] as string;
        if (!val) continue;
        const values = val.split(',').map(v => v.trim()).filter(Boolean);
        if (values.length > 1) {
          specFilters.push({ OR: values.map(v => ({ specifications: { path: [specKey], equals: v } })) });
        } else {
          specFilters.push({ specifications: { path: [specKey], equals: values[0] || val } });
        }
      }
    }
    if (specFilters.length > 0) {
      where.AND = [...(where.AND || []), ...specFilters];
    }

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

productsRouter.get('/:slug', optionalAuth, async (req: AuthRequest, res, next) => {
  try {
    const where: any = { slug: req.params.slug, storeId: req.storeId! };
    if (!req.user) where.status = 'PUBLISHED';
    const product = await prisma.product.findFirst({
      where,
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

productsRouter.post('/', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), validate(createProductSchema), async (req: StoreRequest, res, next) => {
  try {
    const { name, slug, brand, sku, description, specifications, features, price, compareAtPrice, costPerItem, stock, lowStockThreshold, trackInventory, allowBackorder, status, categoryId, tags, seoTitle, seoDescription, returnPolicy, warranty, weight, weightUnit, shippingClass, estimatedDays, freeShipping, images, isFeatured, isNew } = req.body;
    const shortCode = generateShortCode();
    const product = await prisma.product.create({
      data: { name, slug, brand: brand || '', sku, description: description || '', shortCode, specifications: specifications || {}, features: features || [], price, compareAtPrice: compareAtPrice || null, costPerItem: costPerItem || null, stock: stock ?? 0, lowStockThreshold: lowStockThreshold ?? 10, trackInventory: trackInventory ?? true, allowBackorder: allowBackorder ?? false, status: status || 'DRAFT', categoryId, tags: tags || [], seoTitle: seoTitle || '', seoDescription: seoDescription || '', returnPolicy: returnPolicy || '', warranty: warranty || '', weight: weight ?? 0, weightUnit: weightUnit || 'kg', shippingClass: shippingClass || 'standard', estimatedDays: estimatedDays || '5-7 business days', freeShipping: freeShipping ?? false, images: images || [], isFeatured: isFeatured ?? false, isNew: isNew ?? false, storeId: req.storeId! },
    });
    logActivity({ userId: (req as any).user!.userId, action: 'product:created', resource: 'product', resourceId: product.id, req: req as any });
    res.status(201).json({ success: true, data: product });
  } catch (error) { next(error); }
});

productsRouter.put('/:id', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), validate(updateProductSchema), async (req: StoreRequest, res, next) => {
  try {
    const { name, slug, brand, sku, description, specifications, features, price, compareAtPrice, costPerItem, stock, lowStockThreshold, trackInventory, allowBackorder, status, categoryId, tags, seoTitle, seoDescription, returnPolicy, warranty, weight, weightUnit, shippingClass, estimatedDays, freeShipping, images, isFeatured, isNew } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (brand !== undefined) data.brand = brand;
    if (sku !== undefined) data.sku = sku;
    if (description !== undefined) data.description = description;
    if (specifications !== undefined) data.specifications = specifications;
    if (features !== undefined) data.features = features;
    if (price !== undefined) data.price = price;
    if (compareAtPrice !== undefined) data.compareAtPrice = compareAtPrice;
    if (costPerItem !== undefined) data.costPerItem = costPerItem;
    if (stock !== undefined) data.stock = stock;
    if (lowStockThreshold !== undefined) data.lowStockThreshold = lowStockThreshold;
    if (trackInventory !== undefined) data.trackInventory = trackInventory;
    if (allowBackorder !== undefined) data.allowBackorder = allowBackorder;
    if (status !== undefined) data.status = status;
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (tags !== undefined) data.tags = tags;
    if (seoTitle !== undefined) data.seoTitle = seoTitle;
    if (seoDescription !== undefined) data.seoDescription = seoDescription;
    if (returnPolicy !== undefined) data.returnPolicy = returnPolicy;
    if (warranty !== undefined) data.warranty = warranty;
    if (weight !== undefined) data.weight = weight;
    if (weightUnit !== undefined) data.weightUnit = weightUnit;
    if (shippingClass !== undefined) data.shippingClass = shippingClass;
    if (estimatedDays !== undefined) data.estimatedDays = estimatedDays || '5-7 business days';
    if (freeShipping !== undefined) data.freeShipping = freeShipping;
    if (images !== undefined) data.images = images;
    if (isFeatured !== undefined) data.isFeatured = isFeatured;
    if (isNew !== undefined) data.isNew = isNew;
    const product = await prisma.product.update({ where: { id: req.params.id }, data });
    logActivity({ userId: (req as any).user!.userId, action: 'product:updated', resource: 'product', resourceId: product.id, details: { changes: Object.keys(req.body) }, req: req as any });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

productsRouter.delete('/:id', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const references = await prisma.orderItem.count({ where: { productId: req.params.id } });
    if (references > 0) {
      await prisma.product.update({ where: { id: req.params.id }, data: { status: 'ARCHIVED' } });
      logActivity({ userId: (req as any).user!.userId, action: 'product:archived', resource: 'product', resourceId: req.params.id, req: req as any });
      return res.json({ success: true, message: 'Product archived (has order history)' });
    }
    await prisma.product.delete({ where: { id: req.params.id } });
    logActivity({ userId: (req as any).user!.userId, action: 'product:deleted', resource: 'product', resourceId: req.params.id, req: req as any });
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) { next(error); }
});

productsRouter.get('/detail/:id', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, storeId: req.storeId! },
      include: { category: true, variants: true, downloads: true },
    });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    res.json({ success: true, data: product });
  } catch (error) { next(error); }
});

// Variant CRUD
productsRouter.post('/:id/variants', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), validate(createVariantSchema), async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const { name, sku, price, stock, options, image } = req.body;
    const variant = await prisma.productVariant.create({
      data: { productId: req.params.id, name, sku, price: price || 0, stock: stock ?? 0, options: options || [], image: image || '' },
    });
    res.status(201).json({ success: true, data: variant });
  } catch (error) { next(error); }
});

productsRouter.put('/:productId/variants/:id', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), validate(updateVariantSchema), async (req: StoreRequest, res, next) => {
  try {
    const variant = await prisma.productVariant.findFirst({
      where: { id: req.params.id, product: { storeId: req.storeId! } },
    });
    if (!variant) return res.status(404).json({ success: false, error: 'Variant not found' });
    const { name, sku, price, stock, options, image } = req.body;
    const updated = await prisma.productVariant.update({
      where: { id: req.params.id },
      data: { ...(name !== undefined && { name }), ...(sku !== undefined && { sku }), ...(price !== undefined && { price }), ...(stock !== undefined && { stock }), ...(options !== undefined && { options }), ...(image !== undefined && { image }) },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

productsRouter.delete('/:productId/variants/:id', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    const variant = await prisma.productVariant.findFirst({
      where: { id: req.params.id, product: { storeId: req.storeId! } },
    });
    if (!variant) return res.status(404).json({ success: false, error: 'Variant not found' });
    await prisma.productVariant.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Variant deleted' });
  } catch (error) { next(error); }
});

// Bulk replace variants for a product
productsRouter.put('/:id/variants', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), validate(bulkVariantsSchema), async (req: StoreRequest, res, next) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const { variants } = req.body;
    if (!Array.isArray(variants)) return res.status(400).json({ success: false, error: 'variants must be an array' });
    await prisma.productVariant.deleteMany({ where: { productId: req.params.id } });
    if (variants.length > 0) {
      await prisma.productVariant.createMany({
        data: variants.map((v: any) => ({
          productId: req.params.id, name: v.name, sku: v.sku, price: v.price ?? 0, stock: v.stock ?? 0, options: v.options || [], image: v.image || '',
        })),
      });
    }
    const updated = await prisma.product.findFirst({
      where: { id: req.params.id }, include: { variants: true },
    });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

productsRouter.post('/:id/duplicate', authenticate, requirePermission(Permission.MANAGE_PRODUCTS), async (req: StoreRequest, res, next) => {
  try {
    const original = await prisma.product.findUnique({ where: { id: req.params.id }, include: { variants: true } });
    if (!original) return res.status(404).json({ success: false, error: 'Product not found' });

    const { id, createdAt, updatedAt, variants, ...data } = original;
    const duplicate = await prisma.product.create({
      data: { ...data, name: `${data.name} (Copy)`, slug: `${data.slug}-copy`, sku: `${data.sku}-COPY`, status: 'DRAFT' } as any,
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
