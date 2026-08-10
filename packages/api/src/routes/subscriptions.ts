import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';
import { getPaymentProvider } from '../payments';

export const subscriptionsRouter = Router();

const RETAILER_URL = process.env.RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app';

subscriptionsRouter.get('/', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const retailer = await prisma.retailer.findUnique({ where: { userId: req.user!.userId }, include: { subscription: { include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } } } } });
    if (!retailer) return res.status(404).json({ success: false, error: 'Retailer profile not found' });
    if (!retailer.subscription) {
      const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const subscription = await prisma.retailerSubscription.create({ data: { retailerId: retailer.id, trialEnd } });
      return res.json({ success: true, data: subscription });
    }
    const sub = retailer.subscription;
    if (sub.status === 'TRIAL' && sub.trialEnd < new Date()) {
      const updated = await prisma.retailerSubscription.update({ where: { id: sub.id }, data: { status: 'SUSPENDED' } });
      return res.json({ success: true, data: updated });
    }
    res.json({ success: true, data: sub });
  } catch (error) { next(error); }
});

subscriptionsRouter.post('/subscribe', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const retailer = await prisma.retailer.findUnique({ where: { userId: req.user!.userId }, include: { subscription: true } });
    if (!retailer) return res.status(404).json({ success: false, error: 'Retailer profile not found' });

    if (retailer.subscription?.status === 'ACTIVE') {
      return res.json({ success: true, data: retailer.subscription, message: 'Already active' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const provider = getPaymentProvider('pesapal');
    if (!provider) return res.status(503).json({ success: false, error: 'Pesapal is not configured yet' });

    const nextBilling = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const subscription = await prisma.retailerSubscription.upsert({
      where: { retailerId: retailer.id },
      create: { retailerId: retailer.id, status: 'TRIAL', trialStart: new Date(), trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), nextBillingDate: nextBilling },
      update: { nextBillingDate: nextBilling },
    });

    const reference = `SUB-${subscription.id}-${Date.now()}`;
    const base = `${req.protocol}://${req.get('host')}`;
    const callbackUrl = `${base}/api/subscriptions/callback/pesapal`;
    const ipnUrl = `${base}/api/subscriptions/ipn/pesapal?pesapal_notification_type=CHANGE&pesapal_transaction_tracking_id=`;

    const result = await provider.charge(subscription.weeklyAmount, subscription.currency, {
      email: user.email,
      phone: user.phone || undefined,
      reference,
      callbackUrl,
      metadata: { subscriptionId: subscription.id, retailerId: retailer.id, description: 'Lyn-nyx Stores weekly subscription', ipnUrl },
    });

    if (!result.success) {
      return res.status(502).json({ success: false, error: result.message || 'Failed to initiate payment' });
    }

    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: subscription.weeklyAmount,
        currency: subscription.currency,
        method: 'pesapal',
        status: 'PENDING',
        transactionId: result.transactionId,
        periodStart: new Date(),
        periodEnd: nextBilling,
      },
    });

    logActivity({ userId: req.user!.userId, action: 'subscription:payment_initiated', resource: 'subscription', resourceId: subscription.id, details: { amount: subscription.weeklyAmount, method: 'pesapal' }, req: req as any });
    res.json({ success: true, data: { ...subscription, checkoutUrl: result.data?.redirect_url || result.data?.link || null } });
  } catch (error) { next(error); }
});

subscriptionsRouter.post('/cancel', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const retailer = await prisma.retailer.findUnique({ where: { userId: req.user!.userId } });
    if (!retailer) return res.status(404).json({ success: false, error: 'Retailer profile not found' });

    const subscription = await prisma.retailerSubscription.update({
      where: { retailerId: retailer.id },
      data: { status: 'CANCELLED' },
    });

    logActivity({ userId: req.user!.userId, action: 'subscription:cancelled', resource: 'subscription', resourceId: subscription.id, req: req as any });
    res.json({ success: true, data: subscription });
  } catch (error) { next(error); }
});

async function verifySubscriptionPayment(transactionId: string) {
  const provider = getPaymentProvider('pesapal');
  if (!provider) return { ok: false as const, message: 'Pesapal not configured' };

  const result = await provider.verify(transactionId);
  if (!result.success || result.status !== 'PAID') {
    return { ok: false as const, message: result.message || 'Payment not confirmed yet' };
  }

  const payment = await prisma.subscriptionPayment.findFirst({
    where: {
      OR: [{ transactionId: result.transactionId }, { transactionId }],
    },
  });
  if (!payment) return { ok: false as const, message: 'Payment record not found' };

  await prisma.subscriptionPayment.update({ where: { id: payment.id }, data: { status: 'PAID', transactionId: result.transactionId || transactionId } });
  await prisma.retailerSubscription.update({
    where: { id: payment.subscriptionId },
    data: { status: 'ACTIVE', lastBillingDate: new Date(), nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  });
  return { ok: true as const, payment, subscriptionId: payment.subscriptionId };
}

// Pesapal redirects the browser back here after payment
subscriptionsRouter.get('/callback/pesapal', async (req, res, next) => {
  try {
    const transactionId = (req.query.OrderTrackingId as string) || (req.query.pesapal_transaction_tracking_id as string);
    const merchantReference = (req.query.OrderMerchantReference as string) || (req.query.pesapal_merchant_reference as string);

    if (!transactionId && !merchantReference) return res.redirect(`${RETAILER_URL}/subscription?payment=error&message=missing_transaction`);

    const verified = await verifySubscriptionPayment(transactionId || merchantReference);
    if (verified.ok) {
      logActivity({ userId: 'system', action: 'subscription:renewed', resource: 'subscription', resourceId: verified.subscriptionId, req: req as any });
      return res.redirect(`${RETAILER_URL}/subscription?payment=success`);
    }
    res.redirect(`${RETAILER_URL}/subscription?payment=error`);
  } catch (error) { next(error); }
});

// Pesapal IPN — server-to-server, must NOT require auth
subscriptionsRouter.get('/ipn/pesapal', async (req, res, next) => {
  try {
    const transactionId = (req.query.pesapal_transaction_tracking_id as string) || (req.query.pesapal_merchant_reference as string);
    if (transactionId && req.query.pesapal_notification_type === 'CHANGE') {
      await verifySubscriptionPayment(transactionId);
    }
    res.status(200).send('OK');
  } catch (error) { next(error); }
});

subscriptionsRouter.post('/ipn/pesapal', async (req, res, next) => {
  try {
    const body = req.body || {};
    const transactionId = (body.pesapal_transaction_tracking_id as string) || (body.pesapal_merchant_reference as string);
    if (transactionId && body.pesapal_notification_type === 'CHANGE') {
      await verifySubscriptionPayment(transactionId);
    }
    res.status(200).send('OK');
  } catch (error) { next(error); }
});

// Legacy Flutterwave redirect fallback
subscriptionsRouter.get('/callback', async (req, res, next) => {
  try {
    const transactionId = (req.query.transaction_id as string) || (req.query.transactionId as string);
    const txRef = req.query.tx_ref as string | undefined;

    if (!transactionId && !txRef) return res.redirect(`${RETAILER_URL}/subscription?payment=error&message=missing_transaction`);

    const provider = getPaymentProvider('flutterwave');
    const result = await provider!.verify(transactionId || txRef!);

    if (result.success && result.status === 'PAID') {
      const verified = await verifySubscriptionPayment(transactionId || txRef!);
      if (verified.ok) {
        logActivity({ userId: 'system', action: 'subscription:renewed', resource: 'subscription', resourceId: verified.subscriptionId, req: req as any });
        return res.redirect(`${RETAILER_URL}/subscription?payment=success`);
      }
    }
    res.redirect(`${RETAILER_URL}/subscription?payment=error`);
  } catch (error) { next(error); }
});

// Manual verify (frontend polls after redirect)
subscriptionsRouter.post('/verify', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const { transactionId } = req.body;
    if (!transactionId) return res.status(400).json({ success: false, error: 'transactionId is required' });

    const verified = await verifySubscriptionPayment(transactionId);
    if (!verified.ok) return res.status(400).json({ success: false, error: verified.message });
    res.json({ success: true, data: { subscriptionId: verified.subscriptionId, payment: verified.payment } });
  } catch (error) { next(error); }
});

// Flutterwave webhook — server-to-server, must NOT require auth
subscriptionsRouter.post('/webhook/flutterwave', async (req, res, next) => {
  try {
    const secret = await prisma.setting.findUnique({ where: { key: 'FLUTTERWAVE_WEBHOOK_SECRET' } });
    const webhookSecret = (secret?.value as string) || '';
    if (!webhookSecret) return res.status(503).json({ success: false, error: 'Webhook secret not configured' });

    const hash = req.headers['verif-hash'];
    if (!hash || hash !== webhookSecret) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body?.event;
    const data = req.body?.data || {};
    if (event === 'charge.completed' && (data.status === 'successful' || data.status === 'completed')) {
      const txRef = (data.tx_ref as string) || '';
      if (txRef.startsWith('SUB-')) {
        const parts = txRef.split('-');
        const subscriptionId = parts[1];
        const txId = data.id?.toString() || txRef;
        const payment = subscriptionId ? await prisma.subscriptionPayment.findFirst({
          where: { subscriptionId, transactionId: txRef },
        }) : null;
        if (payment) {
          await prisma.subscriptionPayment.update({
            where: { id: payment.id },
            data: { status: 'PAID', transactionId: txId },
          });
          await prisma.retailerSubscription.update({
            where: { id: payment.subscriptionId },
            data: { status: 'ACTIVE', lastBillingDate: new Date(), nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
          });
          logActivity({ userId: 'system', action: 'subscription:webhook_paid', resource: 'subscription', resourceId: payment.subscriptionId, req: req as any });
        }
      } else {
        const payment = await prisma.payment.findFirst({ where: { transactionId: txRef } });
        if (payment) {
          await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PAID' } });
          await prisma.order.update({ where: { id: payment.orderId }, data: { paymentStatus: 'PAID', status: 'PROCESSING' } });
        }
      }
    }

    res.json({ success: true });
  } catch (error) { next(error); }
});

subscriptionsRouter.get('/all', authenticate, requireRole(UserRole.SUPER_DEVELOPER), async (_req: AuthRequest, res, next) => {
  try {
    const subscriptions = await prisma.retailerSubscription.findMany({ include: { retailer: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: subscriptions });
  } catch (error) { next(error); }
});
