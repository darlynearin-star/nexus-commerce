import { Router } from 'express';
import prisma from '@nexus/database';
import { optionalAuth } from '../middleware/auth';
import { requireStore } from '../middleware/resolve-store';
import { calculateCouponDiscount } from '../utils/coupon-discount';

export const cartRouter = Router();

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

cartRouter.post('/add', optionalAuth, async (req: any, res, next) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    if (!productId) return res.status(400).json({ success: false, error: 'productId is required' });
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, error: 'Quantity must be a positive integer' });
    }

    const sessionId = req.headers['x-session-id'] as string;
    const customerId = req.user?.userId || null;
    if (!customerId && !sessionId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // The product must belong to the resolved store (prevents cross-store items).
    const product = await prisma.product.findFirst({ where: { id: productId, storeId: req.storeId! } });
    if (!product) return res.status(404).json({ success: false, error: 'Product not found in this store' });
    if (product.status !== 'PUBLISHED') return res.status(400).json({ success: false, error: 'Product is not available' });

    if (variantId) {
      const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId } });
      if (!variant) return res.status(404).json({ success: false, error: 'Variant not found' });
      if (variant.stock > 0 && quantity > variant.stock) {
        return res.status(400).json({ success: false, error: `Only ${variant.stock} in stock` });
      }
    } else if (product.stock > 0 && quantity > product.stock) {
      return res.status(400).json({ success: false, error: `Only ${product.stock} in stock` });
    }

    let cart = await prisma.cart.findFirst({
      where: customerId
        ? { customerId, storeId: req.storeId! }
        : { sessionId, storeId: req.storeId! },
      orderBy: { updatedAt: 'desc' },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: customerId
          ? { storeId: req.storeId!, customerId }
          : { storeId: req.storeId!, sessionId },
      });
    }

    const vId = variantId || null;
    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, variantId: vId },
    });
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      const cap = vId ? (await prisma.productVariant.findUnique({ where: { id: vId } }))?.stock : product.stock;
      if (cap && cap > 0 && newQty > cap) {
        return res.status(400).json({ success: false, error: `Only ${cap} in stock` });
      }
      await prisma.cartItem.update({ where: { id: existingItem.id }, data: { quantity: newQty } });
    } else {
      await prisma.cartItem.create({ data: { cartId: cart.id, productId, variantId: vId, quantity } });
    }

    const updatedCart = await prisma.cart.findUnique({ where: { id: cart.id }, include: { items: { include: { product: true } } } });
    res.json({ success: true, data: updatedCart });
  } catch (error) { next(error); }
});

// Resolves a cart item only if it belongs to the caller's cart (authenticated
// user or x-session-id guest). Prevents cross-cart item tampering.
async function findOwnedItem(req: any, res: any) {
  const item = await prisma.cartItem.findUnique({
    where: { id: req.params.id },
    include: { cart: { select: { id: true, customerId: true, sessionId: true } } },
  });
  if (!item) {
    res.status(404).json({ success: false, error: 'Cart item not found' });
    return null;
  }
  const sessionId = req.headers['x-session-id'] as string;
  const owned = req.user
    ? item.cart.customerId === req.user.userId
    : (sessionId && item.cart.sessionId === sessionId);
  if (!owned) {
    res.status(403).json({ success: false, error: 'You do not have permission to modify this cart item' });
    return null;
  }
  return item;
}

cartRouter.put('/item/:id', optionalAuth, async (req: any, res, next) => {
  try {
    if (!req.user && !req.headers['x-session-id']) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const owned = await findOwnedItem(req, res);
    if (!owned) return;
    const item = await prisma.cartItem.update({ where: { id: req.params.id }, data: { quantity: req.body.quantity } });
    res.json({ success: true, data: item });
  } catch (error) { next(error); }
});

cartRouter.delete('/item/:id', optionalAuth, async (req: any, res, next) => {
  try {
    if (!req.user && !req.headers['x-session-id']) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const owned = await findOwnedItem(req, res);
    if (!owned) return;
    await prisma.cartItem.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Item removed' });
  } catch (error) { next(error); }
});

cartRouter.post('/coupon', optionalAuth, async (req: any, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, error: 'Coupon code is required' });
    const coupon = await prisma.coupon.findFirst({ where: { code: code.toUpperCase(), storeId: req.storeId! } });
    if (!coupon) return res.status(400).json({ success: false, error: 'Coupon not found' });
    const now = new Date();
    if (!coupon.isActive) return res.status(400).json({ success: false, error: 'Coupon is no longer active' });
    if (coupon.startsAt && coupon.startsAt > now) return res.status(400).json({ success: false, error: 'Coupon is not valid yet' });
    if (coupon.expiresAt < now) return res.status(400).json({ success: false, error: 'Coupon has expired' });
    if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return res.status(400).json({ success: false, error: 'Coupon has reached its usage limit' });

    const sessionId = req.headers['x-session-id'] as string;
    const cart = await prisma.cart.findFirst({
      where: req.user ? { customerId: req.user.userId, storeId: req.storeId! } : { sessionId, storeId: req.storeId! },
      include: { items: { include: { product: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, error: 'Cart is empty' });

    const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({ success: false, error: `This coupon requires a minimum order of ${coupon.minOrderAmount}` });
    }

    // Per-customer usage cap (only enforceable for authenticated customers).
    if (coupon.maxUsesPerCustomer > 0 && req.user) {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user.userId } });
      if (customer) {
        const usedByCustomer = await prisma.couponUsage.count({ where: { couponId: coupon.id, customerId: customer.id } });
        if (usedByCustomer >= coupon.maxUsesPerCustomer) {
          return res.status(400).json({ success: false, error: 'You have already used this coupon the maximum number of times' });
        }
      }
    }

    // appliesTo restricts to specific product ids (empty = all products).
    if (Array.isArray(coupon.appliesTo) && coupon.appliesTo.length > 0) {
      const eligible = cart.items.some(item => coupon.appliesTo.includes(item.productId));
      if (!eligible) return res.status(400).json({ success: false, error: 'This coupon does not apply to any items in your cart' });
    }

    const discount = calculateCouponDiscount(coupon.discountType, coupon.discountValue, subtotal);

    await prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code.toUpperCase(), couponDiscount: discount } });

    // Increment global usage once per successful application.
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
    if (req.user) {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user.userId } });
      if (customer) {
        await prisma.couponUsage.create({ data: { couponId: coupon.id, customerId: customer.id } }).catch(() => {});
      }
    }

    const finalDiscount = coupon.discountType === 'PERCENTAGE' ? coupon.discountValue + '%' : coupon.discountValue;
    res.json({ success: true, data: { discount: finalDiscount, type: coupon.discountType } });
  } catch (error) { next(error); }
});
