import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { requireActiveSubscription } from '../middleware/subscription-check';

export const ordersRouter = Router();
ordersRouter.use(requireStore);
ordersRouter.use(requireActiveSubscription);

ordersRouter.get('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const where: any = { storeId: req.storeId! };
    if ((req as any).user!.role === 'CUSTOMER') {
      const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
      if (customer) where.customerId = customer.id;
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, include: { items: true, customer: { include: { user: true } } }, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.order.count({ where }),
    ]);
    res.json({ success: true, data: orders, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) { next(error); }
});

ordersRouter.get('/:id', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, storeId: req.storeId! }, include: { items: true, customer: { include: { user: true } } } });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (error) { next(error); }
});

ordersRouter.post('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { userId: (req as any).user!.userId } });
    if (!customer) return res.status(400).json({ success: false, error: 'Customer profile not found' });

    const cart = await prisma.cart.findFirst({ where: { customerId: (req as any).user!.userId, storeId: req.storeId! }, include: { items: { include: { product: true } } } });
    if (!cart || cart.items.length === 0) return res.status(400).json({ success: false, error: 'Cart is empty' });

    const store = req.store;
    const freeThreshold = store?.settings?.shippingThreshold || 150000;
    const shippingRate = store?.settings?.shippingRate || 15000;
    const taxRate = (store?.settings?.taxRate || 18) / 100;

    const subtotal = cart.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const orderNumber = `NEXUS-${Date.now().toString(36).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        storeId: req.storeId!, orderNumber, customerId: customer.id,
        subtotal, shippingCost: subtotal >= freeThreshold ? 0 : shippingRate,
        taxAmount: subtotal * taxRate, discountAmount: cart.couponDiscount,
        total: subtotal + (subtotal >= freeThreshold ? 0 : shippingRate) + subtotal * taxRate - cart.couponDiscount,
        items: {
          create: cart.items.map(item => ({
            productId: item.productId, productName: item.product.name, sku: item.product.sku,
            variantId: item.variantId, quantity: item.quantity,
            unitPrice: item.product.price, totalPrice: item.product.price * item.quantity,
          })),
        },
      },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    logActivity({ userId: (req as any).user!.userId, action: 'order:created', resource: 'order', resourceId: order.id, req: req as any });
    res.status(201).json({ success: true, data: order });
  } catch (error) { next(error); }
});

ordersRouter.put('/:id/status', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const order = await prisma.order.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    const updated = await prisma.order.update({ where: { id: req.params.id }, data: { status: req.body.status } });
    logActivity({ userId: (req as any).user!.userId, action: 'order:updated', resource: 'order', resourceId: updated.id, details: { status: req.body.status }, req: req as any });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});
