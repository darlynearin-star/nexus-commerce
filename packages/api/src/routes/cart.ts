import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireStore } from '../middleware/resolve-store';

export const cartRouter = Router();
cartRouter.use(requireStore);

// One-time dedup: remove duplicate cart items caused by old variantId='' bug
cartRouter.post('/dedup', async (_req, res, next) => {
  try {
    const result = await prisma.$executeRawUnsafe(`
      DELETE FROM cart_items
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY "cartId", "productId", CASE WHEN "variantId" IS NULL THEN '__NULL__' ELSE "variantId" END
            ORDER BY id
          ) AS rn
          FROM cart_items
        ) t WHERE t.rn > 1
      );
    `);
    res.json({ success: true, data: { removed: result } });
  } catch (error) { next(error); }
});

cartRouter.get('/', optionalAuth, async (req: any, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    const where: any = { storeId: req.storeId! };
    if (req.user) where.customerId = req.user.userId;
    else if (sessionId) where.sessionId = sessionId;
    else return res.json({ success: true, data: { items: [], subtotal: 0, taxAmount: 0, shippingCost: 0, total: 0 } });

    const cart = await prisma.cart.findFirst({
      where,
      include: { items: { include: { product: { include: { category: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!cart) return res.json({ success: true, data: { items: [], subtotal: 0, taxAmount: 0, shippingCost: 0, total: 0 } });

    const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    res.json({ success: true, data: { ...cart, subtotal, taxAmount: 0, shippingCost: 0, total: subtotal - (cart.couponDiscount || 0) } });
  } catch (error) { next(error); }
});

cartRouter.post('/add', authenticate, async (req: any, res, next) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;

    let cart = await prisma.cart.findFirst({
      where: { customerId: req.user.userId, storeId: req.storeId! },
      orderBy: { updatedAt: 'desc' },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { storeId: req.storeId!, customerId: req.user.userId },
      });
    }

    const vId = variantId || null;
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: vId },
    });
    if (existingItem) {
      await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: existingItem.quantity + quantity } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId: vId, quantity } });
    }

    const updatedCart = await prisma.cart.findUnique({ where: { id: cart.id }, include: { items: { include: { product: true } } } });
    res.json({ success: true, data: updatedCart });
  } catch (error) { next(error); }
});

cartRouter.put('/item/:id', optionalAuth, async (req, res, next) => {
  try {
    const item = await prisma.cartItem.update({ where: { id: req.params.id }, data: { quantity: req.body.quantity } });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
});

cartRouter.delete('/item/:id', optionalAuth, async (req, res, next) => {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Item removed' });
  } catch (error) { next(error); }
});

cartRouter.post('/coupon', optionalAuth, async (req: any, res, next) => {
  try {
    const { code } = req.body;
    const coupon = await prisma.coupon.findFirst({ where: { code, storeId: req.storeId! } });
    if (!coupon || !coupon.isActive || coupon.expiresAt < new Date() || coupon.usedCount >= coupon.maxUses) {
      return res.status(400).json({ success: false, error: 'Invalid or expired coupon' });
    }

    const sessionId = req.headers['x-session-id'] as string;
    const cart = await prisma.cart.findFirst({
      where: req.user ? { customerId: req.user.userId, storeId: req.storeId! } : { sessionId, storeId: req.storeId! },
      orderBy: { updatedAt: 'desc' },
    });

    if (cart) {
      const subtotal = (cart as any).items?.reduce((sum: number, item: any) => sum + (item.product?.price || 0) * item.quantity, 0) || 0;
      const discount = coupon.discountType === 'PERCENTAGE' ? Math.round(subtotal * coupon.discountValue) / 100 : coupon.discountValue;
      await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code, couponDiscount: discount } });
    }

    const finalDiscount = coupon.discountType === 'PERCENTAGE' ? coupon.discountValue + '%' : coupon.discountValue;
    res.json({ success: true, data: { discount: finalDiscount, type: coupon.discountType } });
  } catch (error) { next(error); }
});
