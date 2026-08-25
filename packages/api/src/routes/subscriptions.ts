import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requireRole, AuthRequest, invalidateUserCache } from '../middleware/auth';
import { UserRole } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';
import { getPaymentProvider } from '../payments';
import { runSubscriptionEnforcement } from '../jobs/subscription-enforcer';
import { safeEqual } from '../utils/crypto';

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
    const method = (req.body?.method as string) || 'mobile_money';
    const retailer = await prisma.retailer.findUnique({ where: { userId: req.user!.userId }, include: { subscription: true } });
    if (!retailer) return res.status(404).json({ success: false, error: 'Retailer profile not found' });

    if (retailer.subscription?.status === 'ACTIVE') {
      return res.json({ success: true, data: retailer.subscription, message: 'Already active' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const provider = getPaymentProvider(method);
    if (!provider) return res.status(503).json({ success: false, error: `Payment method not available: ${method}` });

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

    const payment = await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        amount: subscription.weeklyAmount,
        currency: subscription.currency,
        method,
        status: 'PENDING',
        transactionId: result.transactionId,
        periodStart: new Date(),
        periodEnd: nextBilling,
      },
    });

    logActivity({ userId: req.user!.userId, action: 'subscription:payment_initiated', resource: 'subscription', resourceId: subscription.id, details: { amount: subscription.weeklyAmount, method }, req: req as any });
    const isManual = method === 'mobile_money' || method === 'airtel_pay' || method === 'manual';
    res.json({
      success: true,
      data: { ...subscription, checkoutUrl: result.data?.redirect_url || result.data?.link || null },
      payment: isManual ? { id: payment.id, reference, instructions: result.data } : undefined,
    });
  } catch (error) { next(error); }
});

// Retailer reports they have paid a manual mobile-money payment (they include
// the payer number / mobile-money transaction id so the owner can reconcile).
subscriptionsRouter.post('/report-paid', authenticate, requireRole(UserRole.RETAILER), async (req: AuthRequest, res, next) => {
  try {
    const { paymentId, note } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId is required' });

    const payment = await prisma.subscriptionPayment.findFirst({ where: { id: paymentId, subscription: { retailer: { userId: req.user!.userId } } } });
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (payment.status === 'PAID') return res.json({ success: true, message: 'Already confirmed', data: payment });

    await prisma.subscriptionPayment.update({ where: { id: payment.id }, data: { customerNote: note || payment.customerNote || undefined } });
    logActivity({ userId: req.user!.userId, action: 'subscription:payment_reported', resource: 'subscription', resourceId: payment.subscriptionId, details: { paymentId: payment.id }, req: req as any });
    res.json({ success: true, message: 'Payment reported. Waiting for confirmation.', data: payment });
  } catch (error) { next(error); }
});

// Owner confirms a manual mobile-money payment (they verified the money landed).
subscriptionsRouter.post('/confirm', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    const { paymentId, transactionId } = req.body;
    const payment = paymentId
      ? await prisma.subscriptionPayment.findUnique({ where: { id: paymentId } })
      : transactionId
        ? await prisma.subscriptionPayment.findFirst({ where: { transactionId } })
        : null;
    if (!payment) return res.status(404).json({ success: false, error: 'Payment not found' });
    if (payment.status === 'PAID') return res.json({ success: true, message: 'Already paid', data: payment });

    // Atomic claim + activation in one transaction: a double-click or racing
    // second confirm can only win once (CAS on status != PAID).
    const applied = await finalizeSubscriptionPayment(payment, { status: 'PAID' });
    if (!applied) return res.json({ success: true, message: 'Already paid', data: payment });
    logActivity({ userId: req.user!.userId, action: 'subscription:payment_confirmed', resource: 'subscription', resourceId: payment.subscriptionId, details: { paymentId: payment.id, method: payment.method }, req: req as any });
    res.json({ success: true, data: { ...payment, status: 'PAID' } });
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

/**
 * Atomically claims a PENDING subscription payment: the conditional update is
 * a database-level compare-and-set, so a replayed or concurrent event can
 * never claim the same payment twice (once status is PAID the update matches
 * 0 rows). Must run inside a transaction with the activation it guards.
 */
async function claimSubscriptionPayment(paymentId: string, tx: any, data: Record<string, any>): Promise<boolean> {
  const claimed = await tx.subscriptionPayment.updateMany({
    where: { id: paymentId, status: { not: 'PAID' } },
    data,
  });
  return (claimed?.count ?? 0) === 1;
}

/**
 * One business operation = mark PAID + activate subscription + reactivate
 * store, atomically. Returns false when the payment was already claimed
 * (replayed event / lost race) — in that case NOTHING is written.
 * Invariant: a replayed payment event grants no additional entitlement.
 */
async function finalizeSubscriptionPayment(payment: { id: string; subscriptionId: string }, data: Record<string, any>): Promise<boolean> {
  return prisma.$transaction(async (tx: any) => {
    const claimed = await claimSubscriptionPayment(payment.id, tx, data);
    if (!claimed) return false;
    await activateSubscriptionAndStore(payment.subscriptionId, tx);
    return true;
  });
}

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

  // Replay of an already-processed event: acknowledge WITHOUT re-activating
  // and WITHOUT extending nextBillingDate (the free-subscription bug).
  if (payment.status === 'PAID') {
    return { ok: true as const, payment, subscriptionId: payment.subscriptionId, alreadyPaid: true as const };
  }

  const applied = await finalizeSubscriptionPayment(
    payment,
    { status: 'PAID', transactionId: result.transactionId || transactionId },
  );
  if (!applied) {
    // Lost a concurrent race — the winner activated; acknowledge idempotently.
    return { ok: true as const, payment: { ...payment, status: 'PAID' }, subscriptionId: payment.subscriptionId, alreadyPaid: true as const };
  }
  return { ok: true as const, payment: { ...payment, status: 'PAID' }, subscriptionId: payment.subscriptionId };
}

// Marks a subscription ACTIVE, clears any grace/suspension flags, and
// reactivates the retailer's store so it is served on the storefront again.
// Accepts a transaction client so claim+activate commit atomically.
async function activateSubscriptionAndStore(subscriptionId: string, tx: any = prisma) {
  await tx.retailerSubscription.update({
    where: { id: subscriptionId },
    data: { status: 'ACTIVE', lastBillingDate: new Date(), nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), graceNotifiedAt: null, suspendedAt: null },
  });
  const sub = await tx.retailerSubscription.findUnique({ where: { id: subscriptionId }, include: { retailer: true } });
  if (sub?.retailer?.storeSlug) {
    await tx.store.updateMany({ where: { slug: sub.retailer.storeSlug }, data: { isActive: true } });
  }
}

// Pesapal redirects the browser back here after payment
subscriptionsRouter.get('/callback/pesapal', async (req, res, next) => {
  try {
    const transactionId = (req.query.OrderTrackingId as string) || (req.query.pesapal_transaction_tracking_id as string);
    const merchantReference = (req.query.OrderMerchantReference as string) || (req.query.pesapal_merchant_reference as string);

    if (!transactionId && !merchantReference) return res.redirect(`${RETAILER_URL}/subscription?payment=error&message=missing_transaction`);

    const verified = await verifySubscriptionPayment(transactionId || merchantReference);
    if (verified.ok) {
      // Audit only genuine renewals — replays of an already-processed payment
      // must not inflate the renewal log.
      if (!verified.alreadyPaid) {
        logActivity({ userId: 'system', action: 'subscription:renewed', resource: 'subscription', resourceId: verified.subscriptionId, req: req as any });
      }
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
        if (!verified.alreadyPaid) {
          logActivity({ userId: 'system', action: 'subscription:renewed', resource: 'subscription', resourceId: verified.subscriptionId, req: req as any });
        }
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
      // M-timing: constant-time compare — a naive !== leaks prefix-match
      // timing to anyone probing the webhook endpoint.
      if (!hash || !safeEqual(String(hash), webhookSecret)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body?.event;
    const data = req.body?.data || {};
    if (event === 'charge.completed' && (data.status === 'successful' || data.status === 'completed')) {
      const txRef = (data.tx_ref as string) || '';
      if (txRef.startsWith('SUB-')) {
        // Reference format: `SUB-<subscriptionId>-<timestamp>`. Subscription ids
        // are dashed UUIDs, so split('-')[1] truncates them — take everything
        // between the 'SUB-' prefix and the final timestamp segment.
        const subscriptionId = txRef.slice(4, txRef.lastIndexOf('-'));
        const txId = data.id?.toString() || txRef;
        const payment = subscriptionId ? await prisma.subscriptionPayment.findFirst({
          where: { subscriptionId, transactionId: txRef },
        }) : null;
        if (payment) {
          // Same CAS + transaction discipline as the Pesapal/manual paths: a
          // replayed webhook can only win once.
          const applied = await finalizeSubscriptionPayment(payment, { status: 'PAID', transactionId: txId });
          if (applied) {
            logActivity({ userId: 'system', action: 'subscription:webhook_paid', resource: 'subscription', resourceId: payment.subscriptionId, req: req as any });
          }
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
    const subscriptions = await prisma.retailerSubscription.findMany({
      include: {
        retailer: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true, isActive: true } } } },
        payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
      orderBy: { createdAt: 'desc' },
    });
    const slugs = Array.from(new Set(subscriptions.map(s => s.retailer?.storeSlug).filter(Boolean))) as string[];
    const stores = await prisma.store.findMany({ where: { slug: { in: slugs } }, select: { id: true, name: true, slug: true, isActive: true, createdAt: true } });
    const storeBySlug = new Map(stores.map(st => [st.slug, st]));
    res.json({
      success: true,
      data: subscriptions.map(s => ({ ...s, store: s.retailer?.storeSlug ? storeBySlug.get(s.retailer.storeSlug) || null : null })),
    });
  } catch (error) { next(error); }
});

// Manually trigger the auto-suspension job (grace notices + suspensions)
subscriptionsRouter.post('/enforce', authenticate, requireRole(UserRole.SUPER_DEVELOPER), async (_req: AuthRequest, res, next) => {
  try {
    const result = await runSubscriptionEnforcement();
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

// DEV: reset a retailer's subscription to a fresh paid week
subscriptionsRouter.post('/:id/reset-week', authenticate, requireRole(UserRole.SUPER_DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    const sub = await prisma.retailerSubscription.findUnique({ where: { id: req.params.id } });
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' });
    const now = new Date();
    const nextBilling = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const updated = await prisma.retailerSubscription.update({
      where: { id: sub.id },
      data: { status: 'ACTIVE', lastBillingDate: now, nextBillingDate: nextBilling },
    });
    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        amount: sub.weeklyAmount,
        currency: sub.currency,
        method: 'manual_dev_reset',
        status: 'PAID',
        periodStart: now,
        periodEnd: nextBilling,
      },
    });
    logActivity({ userId: req.user!.userId, action: 'subscription:dev_reset', resource: 'subscription', resourceId: sub.id, req: req as any });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// DEV: lock an account whose subscription has expired (suspends user, store, subscription)
subscriptionsRouter.post('/:id/lock', authenticate, requireRole(UserRole.SUPER_DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    const sub = await prisma.retailerSubscription.findUnique({ where: { id: req.params.id }, include: { retailer: true } });
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' });
    const retailer = sub.retailer;
    if (retailer?.storeSlug) {
      await prisma.store.updateMany({ where: { slug: retailer.storeSlug }, data: { isActive: false } });
    }
    if (retailer) {
      await prisma.user.update({ where: { id: retailer.userId }, data: { isActive: false } });
      invalidateUserCache(retailer.userId);
      await prisma.session.updateMany({ where: { userId: retailer.userId, isActive: true }, data: { isActive: false } });
    }
    await prisma.retailerSubscription.update({ where: { id: sub.id }, data: { status: 'SUSPENDED' } });
    logActivity({ userId: req.user!.userId, action: 'subscription:dev_lock', resource: 'subscription', resourceId: sub.id, req: req as any });
    res.json({ success: true, message: 'Account locked' });
  } catch (error) { next(error); }
});

// DEV: unlock/reactivate a previously locked account
subscriptionsRouter.post('/:id/unlock', authenticate, requireRole(UserRole.SUPER_DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    const sub = await prisma.retailerSubscription.findUnique({ where: { id: req.params.id }, include: { retailer: true } });
    if (!sub) return res.status(404).json({ success: false, error: 'Subscription not found' });
    const retailer = sub.retailer;
    if (retailer?.storeSlug) {
      await prisma.store.updateMany({ where: { slug: retailer.storeSlug }, data: { isActive: true } });
    }
    if (retailer) {
      await prisma.user.update({ where: { id: retailer.userId }, data: { isActive: true } });
      invalidateUserCache(retailer.userId);
    }
    if (sub.status === 'SUSPENDED') {
      const now = new Date();
      await prisma.retailerSubscription.update({
        where: { id: sub.id },
        data: { status: 'ACTIVE', lastBillingDate: now, nextBillingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      });
    }
    logActivity({ userId: req.user!.userId, action: 'subscription:dev_unlock', resource: 'subscription', resourceId: sub.id, req: req as any });
    res.json({ success: true, message: 'Account unlocked' });
  } catch (error) { next(error); }
});
