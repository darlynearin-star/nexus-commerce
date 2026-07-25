import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const cartRouter = Router();
cartRouter.use(requireStore);

cartRouter.get('/', optionalAuth, async (req: StoreRequest, res, next) => {
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
    const store = req.store;
    const freeThreshold = store?.settings?.shippingThreshold || 150000;
    const shippingRate = store?.settings?.shippingRate || 15000;
    const taxRate = (store?.settings?.taxRate || 18) / 100;
    const shippingCost = subtotal >= freeThreshold ? 0 : shippingRate;
    res.json({ success: true, data: { ...cart, subtotal, taxAmount: subtotal * taxRate, shippingCost, total: subtotal + shippingCost + subtotal * taxRate - cart.couponDiscount } });
  } catch (error) { next(error); }
});

cartRouter.post('/add', optionalAuth, async (req: StoreRequest, res, next) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    let cart = await prisma.cart.findFirst({
      where: req.user ? { customerId: req.user.userId, storeId: req.storeId! } : { sessionId, storeId: req.storeId! },
      orderBy: { updatedAt: 'desc' },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { storeId: req.storeId!, ...(req.user ? { customerId: req.user.userId } : { sessionId }) },
      });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId_variantId: { cartId: cart.id, productId, variantId: variantId || '' } },
    });
    if (existingItem) {
      await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: existingItem.quantity + quantity } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId: variantId || null, quantity } });
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

cartRouter.post('/coupon', optionalAuth, async (req: StoreRequest, res, next) => {
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
      const discount = coupon.discountType === 'PERCENTAGE' ? coupon.discountValue : coupon.discountValue;
      await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code, couponDiscount: discount } });
    }

    res.json({ success: true, data: { discount: coupon.discountValue, type: coupon.discountType } });
  } catch (error) { next(error); }
});
