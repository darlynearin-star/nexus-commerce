import prisma from '@nexus/database';
import { sendEmail, subscriptionExpiredHtml, subscriptionSuspendedHtml } from '../utils/email';
import { logActivity } from '../utils/activity-log';
import { logger } from '../utils/logger';

const DAY_MS = 24 * 60 * 60 * 1000;
const RETAILER_URL = process.env.RETAILER_DASHBOARD_URL || 'https://nexus-commerce-retailer-dashboard.vercel.app';

const DEFAULT_GRACE_DAYS = 3;

async function getGraceDays(): Promise<number> {
  const envVal = process.env.SUBSCRIPTION_GRACE_DAYS;
  if (envVal) {
    const n = parseInt(envVal, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'SUBSCRIPTION_GRACE_DAYS' } });
    if (setting && setting.value != null) {
      const n = parseInt(String(setting.value), 10);
      if (!Number.isNaN(n) && n >= 0) return n;
    }
  } catch {
    // fall back to default
  }
  return DEFAULT_GRACE_DAYS;
}

interface EnforcementResult {
  notice: number;
  suspended: number;
  errors: number;
}

/**
 * Finds subscriptions that have lapsed (TRIAL past its end, or ACTIVE past
 * its next billing date) and:
 *   1. First pass: records the grace start and emails the owner with a
 *      deadline (default 3 days, configurable via SUBSCRIPTION_GRACE_DAYS).
 *   2. If the grace period elapses without renewal: suspends the subscription,
 *      deactivates the store, emails the owner, and posts an in-app alert.
 *
 * Each subscription is processed in isolation: a failure on one row (bad
 * retailer link, FK issue, email outage) is logged and counted, and the
 * remaining subscriptions are still processed.
 */
export async function runSubscriptionEnforcement(): Promise<EnforcementResult> {
  const graceDays = await getGraceDays();
  const now = new Date();
  const result: EnforcementResult = { notice: 0, suspended: 0, errors: 0 };

  const expired = await prisma.retailerSubscription.findMany({
    where: {
      status: { in: ['TRIAL', 'ACTIVE'] },
      OR: [
        { status: 'TRIAL', trialEnd: { lt: now } },
        { status: 'ACTIVE', nextBillingDate: { lt: now } },
      ],
    },
    include: {
      retailer: {
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
      },
    },
  });

  for (const sub of expired) {
    try {
      await processLapsedSubscription(sub, graceDays, now, result);
    } catch (e: any) {
      // Isolate failures: one broken subscription must never abort the sweep
      // (previously a single throw left every remaining retailer unprocessed
      // for that run — and could strand a store suspended without its notice).
      result.errors += 1;
      logger.warn(`Enforcer: subscription ${sub.id} failed: ${e?.message || e}`);
    }
  }

  if (result.notice || result.suspended || result.errors) {
    logger.info(`Subscription enforcer: ${result.notice} grace notice(s), ${result.suspended} suspension(s), ${result.errors} error(s)`);
  }
  return result;
}

async function processLapsedSubscription(sub: any, graceDays: number, now: Date, result: EnforcementResult): Promise<void> {
  const user = sub.retailer?.user;
  const email = user?.email;
  const storeName = sub.retailer?.storeName || 'your store';
  const renewUrl = `${RETAILER_URL}/subscription`;
  const userId = user?.id || 'system';

    if (!sub.graceNotifiedAt) {
      await prisma.retailerSubscription.update({ where: { id: sub.id }, data: { graceNotifiedAt: now } });
      result.notice += 1;

      if (email) {
        await sendEmail({
          to: email,
          subject: 'Your Lyn-nyx Stores subscription has expired',
          text: `The subscription for ${storeName} has expired. Renew within ${graceDays} day${graceDays === 1 ? '' : 's'} or your store will be suspended. ${renewUrl}`,
          html: subscriptionExpiredHtml({ storeName, days: graceDays, url: renewUrl }),
        });
      }
      await prisma.notification.create({
        data: {
          userId,
          type: 'TIER_WARNING',
          channel: 'IN_APP',
          title: 'Subscription expired',
          message: `Your subscription expired. Renew within ${graceDays} day${graceDays === 1 ? '' : 's'} or your store will be suspended.`,
        },
      });
      await logActivity({
        userId,
        action: 'subscription:grace_notice',
        resource: 'subscription',
        resourceId: sub.id,
        details: { graceDays },
      });
    } else if (now.getTime() - new Date(sub.graceNotifiedAt).getTime() >= graceDays * DAY_MS) {
      const storeSlug = sub.retailer?.storeSlug;
      if (storeSlug) {
        await prisma.store.updateMany({ where: { slug: storeSlug }, data: { isActive: false } });
      }
      await prisma.retailerSubscription.update({
        where: { id: sub.id },
        data: { status: 'SUSPENDED', suspendedAt: now },
      });
      result.suspended += 1;

      if (email) {
        await sendEmail({
          to: email,
          subject: 'Your Lyn-nyx store has been suspended',
          text: `Your store ${storeName} has been suspended because your subscription expired and was not renewed within the grace period. Renew to reactivate it: ${renewUrl}`,
          html: subscriptionSuspendedHtml({ storeName, url: renewUrl }),
        });
      }
      await prisma.notification.create({
        data: {
          userId,
          type: 'TIER_WARNING',
          channel: 'IN_APP',
          title: 'Store suspended',
          message: 'Your store was suspended because your subscription was not renewed. Renew to reactivate it.',
        },
      });
      await logActivity({
        userId,
        action: 'subscription:auto_suspended',
        resource: 'subscription',
        resourceId: sub.id,
        details: { storeSlug },
      });
    }
}