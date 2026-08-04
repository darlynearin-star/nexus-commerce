import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@nexus/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { getPaymentProvider } from '../payments';
import { logActivity } from '../utils/activity-log';

export const paymentsRouter = Router();
paymentsRouter.use(requireStore);

paymentsRouter.post('/charge', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { orderId, method, phone } = req.body;
    const order = await prisma.order.findFirst({ where: { id: orderId, storeId: req.storeId! } });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const provider = getPaymentProvider(method);
    if (!provider) return res.status(400).json({ success: false, error: `Unsupported payment method: ${method}` });

    const reference = uuidv4();
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/payments/callback`;

    const result = await provider.charge(order.total, order.currency, {
      email: (req as any).user!.email,
      phone,
      reference,
      callbackUrl,
      metadata: { orderId: order.id, orderNumber: order.orderNumber, storeId: req.storeId },
    });

    if (result.success) {
      await prisma.payment.create({
        data: { orderId: order.id, amount: order.total, currency: order.currency, method, status: 'PENDING', transactionId: result.transactionId },
      });
      logActivity({ userId: (req as any).user!.userId, action: 'payment:initiated', resource: 'payment', resourceId: result.transactionId || '', details: { method, amount: order.total }, req: req as any });
    }

    res.json({ success: result.success, data: result });
  } catch (error) { next(error); }
});

paymentsRouter.post('/verify', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { transactionId, method } = req.body;
    const provider = getPaymentProvider(method);
    if (!provider) return res.status(400).json({ success: false, error: `Unsupported payment method: ${method}` });

    const result = await provider.verify(transactionId);

    if (result.success && result.status === 'PAID') {
      const payment = await prisma.payment.update({ where: { transactionId }, data: { status: 'PAID' } });
      await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', status: 'PROCESSING' } });
      logActivity({ userId: (req as any).user!.userId, action: 'payment:verified', resource: 'payment', resourceId: transactionId, req: req as any });
    }

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

paymentsRouter.post('/callback', async (req, res, next) => {
  try {
    const { transaction_id, tx_ref, status } = req.body;
    if (status === 'successful' || status === 'completed') {
      const payment = await prisma.payment.findFirst({ where: { transactionId: transaction_id?.toString() || tx_ref } });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } });
        await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', status: 'PROCESSING' } });
      }
    }
    res.json({ success: true });
  } catch (error) { next(error); }
});
