import { Router, Response, NextFunction } from 'express';
import prisma from '@nexus/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';
import { requireActiveSubscription } from '../middleware/subscription-check';

export const ordersRouter = Router();
ordersRouter.use(requireStore);
ordersRouter.use(requireActiveSubscription);

const safeUser = { select: { id: true, email: true, firstName: true, lastName: true, avatar: true, phone: true, isActive: true, createdAt: true } };

// Retailers/devs may only view orders of stores they own (dev roles bypass via
// requireStoreOwner). Customers always see only their own orders.
function ownerOrCustomer(req: StoreRequest, res: Response, next: NextFunction) {
  if ((req as AuthRequest).user!.role === 'CUSTOMER') return next();
  return requireStoreOwner(req as StoreRequest & AuthRequest, res, next);
}

ordersRouter.get('/', authenticate, ownerOrCustomer, async (req: StoreRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: any = { storeId: req.storeId! };
    if ((req as any).user!.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
      if (customer) where.customerId = customer.id;
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true, customer: { include: { user: safeUser } } }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.order.count({ where }),
    ]);
    res.json({ success: true, data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

ordersRouter.get('/:id', authenticate, ownerOrCustomer, async (req: StoreRequest, res, next) => {
  try {
    const where: any = { id: req.params.id, storeId: req.storeId! };
    if ((req as any).user!.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
      if (customer) where.customerId = customer.id;
    }
    const order = await prisma.order.findFirst({ where, include: { items: true, customer: { include: { user: safeUser } } } });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
});

ordersRouter.post('/', optionalAuth, async (req: StoreRequest & AuthRequest, res, next) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;
    let customerId: string | null = null;
    let contactName = 'Guest';
    if (req.user) {
      const customer = await prisma.customer.findUnique({ where: { userId: req.user.userId } });
      if (!customer) return res.status(400).json({ success: false, error: 'Customer profile not found' });
      customerId = customer.id;
      contactName = (req.user as any).firstName || 'Customer';
    } else if (sessionId) {
      const guestEmail = req.body.guestEmail || '';
      if (!guestEmail) return res.status(400).json({ success: false, error: 'Email is required for guest checkout' });
      contactName = req.body.guestName || 'Guest';
    } else {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Idempotency: a client retry with the same key returns the original order.
    const idempotencyKey = (req.headers['x-idempotency-key'] as string) || req.body.idempotencyKey;
    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({ where: { storeId: req.storeId!, idempotencyKey } });
      if (existing) {
        return res.status(201).json({ success: true, data: existing, duplicate: true });
      }
    }

    // Cart.customerId references the User id (see routes/cart.ts), NOT the
    // Customer row id. Searching by customer.id here returned "Cart is empty",
    // breaking authenticated checkout; guest carts stay keyed by session id.
    const cart = await prisma.cart.findFirst({
      where: req.user
        ? { customerId: req.user.userId, storeId: req.storeId! }
        : { sessionId, storeId: req.storeId! },
      include: { items: { include: { product: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, error: 'Cart is empty' });

    // Order-time integrity: every item must belong to the resolved store and
    // still be available (guards against tampered carts / stale items).
    const foreignItem = cart.items.find(item => item.product.storeId !== req.storeId!);
    if (foreignItem) return res.status(400).json({ success: false, error: `"${foreignItem.product.name}" is no longer available in this store` });
    const unavailable = cart.items.find(item => item.product.status !== 'PUBLISHED');
    if (unavailable) return res.status(400).json({ success: false, error: `"${unavailable.product.name}" is no longer available` });

    const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const orderNumber = `NEXUS-${Date.now().toString(36).toUpperCase()}`;

    // Shipping: apply the store's configured flat rate, free above the threshold.
    // Stores without a configured rate (or 0) keep the historical 0 cost.
    const settings = req.store!.settings as any;
    const shippingRate = Number(settings?.shippingRate || 0);
    const shippingThreshold = Number(settings?.shippingThreshold || 0);
    const shippingCost = shippingRate > 0 && !(shippingThreshold > 0 && subtotal >= shippingThreshold) ? shippingRate : 0;

    // Re-validate the applied coupon at order time: if it has since expired or
    // hit its cap, the discount is dropped rather than silently honored.
    let couponId: string | null = null;
    let discountAmount = cart.couponDiscount || 0;
    if (cart.couponCode) {
      const coupon = await prisma.coupon.findFirst({ where: { code: cart.couponCode, storeId: req.storeId! } });
      const couponValid = coupon && coupon.isActive && coupon.expiresAt >= new Date() && (coupon.maxUses <= 0 || coupon.usedCount <= coupon.maxUses);
      if (couponValid) {
        couponId = coupon.id;
      } else {
        discountAmount = 0;
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          storeId: req.storeId!, orderNumber, customerId,
          guestEmail: req.body.guestEmail || '',
          guestName: req.body.guestName || '',
          subtotal, shippingCost,
          taxAmount: 0, discountAmount, couponId,
          total: subtotal - discountAmount + shippingCost,
          customerPhone: req.body.customerPhone || '',
          shippingAddress: req.body.shippingAddress || '',
          notes: req.body.notes || '',
          paymentMethod: 'pay_on_delivery',
          idempotencyKey: idempotencyKey || undefined,
          items: {
            create: cart.items.map(item => ({
              productId: item.productId, productName: item.product.name, sku: item.product.sku,
              variantId: item.variantId || null, quantity: item.quantity,
              unitPrice: item.product.price, totalPrice: item.product.price * item.quantity,
            })),
          },
        },
      });

      // Notify store owner of new order (within the same transaction so a
      // partial failure cannot leave an order without its notification).
      const itemSummary = cart.items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
      await tx.notification.create({
        data: { userId: req.store!.ownerId, type: 'NEW_ORDER_ALERT', channel: 'IN_APP', title: `New Order ${orderNumber}`, message: `${contactName} placed an order: ${itemSummary}`, data: JSON.stringify({ orderId: created.id, total: created.total }) },
      }).catch(() => {});

      // Clear the cart only after the order is durably created.
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    const [contact] = await prisma.$queryRaw`SELECT phone, whatsapp FROM store_settings WHERE "storeId" = ${req.storeId!}` as any;
    if (req.user) logActivity({ userId: req.user.userId, action: 'order:created', resource: 'order', resourceId: order.id, req: req as any });
    res.status(201).json({ success: true, data: { ...order, shippingCost, storePhone: contact?.phone || '', storeWhatsapp: contact?.whatsapp || '' } });
  } catch (error) { next(error); }
});

ordersRouter.put('/:id/status', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const updated = await prisma.order.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    logActivity({ userId: (req as any).user!.userId, action: 'order:updated', resource: 'order', resourceId: updated.id, details: { status: req.body.status }, req: req as any });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});
