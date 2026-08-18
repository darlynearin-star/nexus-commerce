import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@nexus/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';
import { getPaymentProvider } from '../payments';
import { logActivity } from '../utils/activity-log';

export const paymentsRouter = Router();

const STOREFRONT_URL = process.env.STOREFRONT_URL || 'https://nexus-storefront-dusky.vercel.app';

async function markPaid(transactionId: string) {
  const payment = await prisma.payment.findFirst({ where: { transactionId } });
  if (payment) {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } });
    await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', status: 'PROCESSING' } });
  }
  return payment;
}

async function verifyAndMark(transactionId: string, method: string) {
  const provider = getPaymentProvider(method || 'pesapal');
  if (!provider) return null;
  const result = await provider.verify(transactionId);
  if (result.success && result.status === 'PAID') {
    await markPaid(transactionId);
  }
  return result;
}

// Only consider a notification for a transaction we actually issued (guards
// against probing / IPN spam with random identifiers).
async function knownPayment(transactionId?: string | null): Promise<boolean> {
  if (!transactionId) return false;
  const payment = await prisma.payment.findFirst({ where: { transactionId } });
  return !!payment;
}

paymentsRouter.get('/callback/pesapal', async (req, res, next) => {
  try {
    const { OrderTrackingId, OrderMerchantReference } = req.query as any;
    const transactionId = OrderTrackingId || OrderMerchantReference;
    if (transactionId && (await knownPayment(transactionId))) {
      await verifyAndMark(transactionId, 'pesapal');
    }
    res.redirect(`${STOREFRONT_URL}/checkout?status=callback&order=${encodeURIComponent(OrderMerchantReference || transactionId || '')}`);
  } catch (error) { next(error); }
});

paymentsRouter.get('/ipn/pesapal', async (req, res, next) => {
  try {
    const { pesapal_transaction_tracking_id, pesapal_merchant_reference } = req.query as any;
    const transactionId = pesapal_transaction_tracking_id || pesapal_merchant_reference;
    if (transactionId && req.query.pesapal_notification_type === 'CHANGE' && (await knownPayment(transactionId))) {
      await verifyAndMark(transactionId, 'pesapal');
    }
    res.status(200).send('OK');
  } catch (error) { next(error); }
});

paymentsRouter.post('/ipn/pesapal', async (req, res, next) => {
  try {
    const { pesapal_transaction_tracking_id, pesapal_merchant_reference, pesapal_notification_type } = req.body || {};
    const transactionId = pesapal_transaction_tracking_id || pesapal_merchant_reference;
    if (transactionId && pesapal_notification_type === 'CHANGE' && (await knownPayment(transactionId))) {
      await verifyAndMark(transactionId, 'pesapal');
    }
    res.status(200).send('OK');
  } catch (error) { next(error); }
});

// Generic provider callback (e.g. Flutterwave). Never trust a client-supplied
// status: only mark a payment paid after a successful server-to-server
// verification with the provider for a transaction we issued.
paymentsRouter.post('/callback', async (req, res, next) => {
  try {
    const { transaction_id, tx_ref } = req.body;
    const transactionId = (transaction_id?.toString() || tx_ref) as string | undefined;
    if (!transactionId || !(await knownPayment(transactionId))) {
      return res.json({ success: false, error: 'Unknown transaction' });
    }
    const payment = await prisma.payment.findFirst({ where: { transactionId } });
    if (payment) {
      const provider = getPaymentProvider(payment.method);
      if (provider) {
        const result = await provider.verify(transactionId);
        if (result.success && result.status === 'PAID') {
          await markPaid(transactionId);
        }
      }
    }
    res.json({ success: true });
  } catch (error) { next(error); }
});

paymentsRouter.use(requireStore);

paymentsRouter.post('/charge', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { orderId, method, phone } = req.body;
    const order = await prisma.order.findFirst({ where: { id: orderId, storeId: req.storeId! } });
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

    const provider = getPaymentProvider(method);
    if (!provider) return res.status(400).json({ success: false, error: `Unsupported payment method: ${method}` });

    const reference = uuidv4();
    const base = `${req.protocol}://${req.get('host')}`;
    const isPesapal = ['pesapal', 'mtn_momo', 'airtel_money'].includes(method.toLowerCase());
    const callbackUrl = isPesapal ? `${base}/api/payments/callback/pesapal` : `${base}/api/payments/callback`;
    const ipnUrl = `${base}/api/payments/ipn/pesapal?pesapal_notification_type=CHANGE&pesapal_transaction_tracking_id=`;
    const slug = method.toLowerCase();
    const network = slug.includes('mtn') ? 'MTN' : slug.includes('airtel') ? 'AIRTEL' : undefined;

    const result = await provider.charge(order.total, order.currency, {
      email: (req as any).user!.email,
      phone,
      reference,
      callbackUrl,
      network,
      metadata: { orderId: order.id, orderNumber: order.orderNumber, storeId: req.storeId, ipnUrl },
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
      await markPaid(transactionId);
      logActivity({ userId: (req as any).user!.userId, action: 'payment:verified', resource: 'payment', resourceId: transactionId, req: req as any });
    }

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});
