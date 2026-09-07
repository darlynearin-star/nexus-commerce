/**
 * Pre-launch data reset (destructive).
 *
 * Deletes ALL stores, products, orders, accounts, reviews, analytics, carts,
 * wishlists, tickets, sessions and every other content row — EXCEPT:
 *   - users with role SUPER_DEVELOPER (and their Developer + Session rows), so
 *     the owner account survives login;
 *   - the 'system' actor (id='system', FK target for enforcer/audit writes);
 *   - config tables (settings, feature_flags, kill_switch) are NOT touched.
 *
 * USAGE (from repo root):
 *   $env:DATABASE_URL = "<ProdConnectionString>"   # or load packages/database/.env
 *   npm run db:reset-data --workspace packages/database -- --dry-run   # inspect only
 *   npm run db:reset-data --workspace packages/database                 # execute
 *
 * No SEED_FORCE-style guard here on purpose: this is the sanctioned pre-launch
 * wipe. See packages/database/src/seed.ts for the guarded (demo) reset.
 */
import prisma from '../src/index';

const DRY_RUN = process.argv.includes('--dry-run');

async function countTable(name: string, cb: () => Promise<number>): Promise<number> {
  const n = await cb();
  console.log(`  ${name}: ${n}`);
  return n;
}

async function main() {
  if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_FALLBACK) {
    console.error('ERROR: set DATABASE_URL (or DATABASE_URL_FALLBACK) first.');
    process.exit(1);
  }
  console.log(`RESET DATA — running in ${DRY_RUN ? 'DRY-RUN (no writes)' : 'EXECUTE'} mode\n`);

  const kept = await prisma.user.findMany({
    where: { OR: [{ role: 'SUPER_DEVELOPER' }, { id: 'system' }] },
    select: { id: true, email: true, role: true },
  });
  const keptIds = kept.map((u) => u.id);
  const excludedUsers = keptIds.length
    ? { where: { userId: { notIn: keptIds } } }
    : { where: {} };
  const excludedUserRows = keptIds.length
    ? { where: { id: { notIn: keptIds } } }
    : { where: {} };

  console.log(`Preserving ${kept.length} account(s):`);
  for (const u of kept) console.log(`  - ${u.email} (${u.role}, id=${u.id})`);
  console.log('Not touching: settings, feature_flags, kill_switch\n');
  console.log('Rows that would be deleted:');

  let total = 0;
  const report = (n: number) => { total += n; };
  const tables: [string, () => Promise<number>][] = [
    ['ticket_messages', () => prisma.ticketMessage.deleteMany({}).then(r => r.count)],
    ['support_tickets', () => prisma.supportTicket.deleteMany({}).then(r => r.count)],
    ['activity_logs', () => prisma.activityLog.deleteMany({}).then(r => r.count)],
    ['notifications', () => prisma.notification.deleteMany({}).then(r => r.count)],
    ['subscription_payments', () => prisma.subscriptionPayment.deleteMany({}).then(r => r.count)],
    ['retailer_subscriptions', () => prisma.retailerSubscription.deleteMany({}).then(r => r.count)],
    ['order_items', () => prisma.orderItem.deleteMany({}).then(r => r.count)],
    ['orders', () => prisma.order.deleteMany({}).then(r => r.count)],
    ['payments', () => prisma.payment.deleteMany({}).then(r => r.count)],
    ['reviews', () => prisma.review.deleteMany({}).then(r => r.count)],
    ['wishlist_items', () => prisma.wishlistItem.deleteMany({}).then(r => r.count)],
    ['wishlists', () => prisma.wishlist.deleteMany({}).then(r => r.count)],
    ['cart_items', () => prisma.cartItem.deleteMany({}).then(r => r.count)],
    ['carts', () => prisma.cart.deleteMany({}).then(r => r.count)],
    ['product_variants', () => prisma.productVariant.deleteMany({}).then(r => r.count)],
    ['media', () => prisma.media.deleteMany({}).then(r => r.count)],
    ['product_downloads', () => prisma.productDownload.deleteMany({}).then(r => r.count)],
    ['products', () => prisma.product.deleteMany({}).then(r => r.count)],
    ['categories', () => prisma.category.deleteMany({}).then(r => r.count)],
    ['brands', () => prisma.brand.deleteMany({}).then(r => r.count)],
    ['store_emails', () => prisma.storeEmail.deleteMany({}).then(r => r.count)],
    ['store_themes', () => prisma.storeTheme.deleteMany({}).then(r => r.count)],
    ['store_settings', () => prisma.storeSettings.deleteMany({}).then(r => r.count)],
    ['coupons', () => prisma.coupon.deleteMany({}).then(r => r.count)],
    ['coupon_usage', () => prisma.couponUsage.deleteMany({}).then(r => r.count)],
    ['analytics_events', () => prisma.analyticsEvent.deleteMany({}).then(r => r.count)],
    ['ad_videos', () => prisma.adVideo.deleteMany({}).then(r => r.count)],
    ['addresses', () => prisma.address.deleteMany({}).then(r => r.count)],
    ['stores', () => prisma.store.deleteMany({}).then(r => r.count)],
    ['customers', () => prisma.customer.deleteMany({}).then(r => r.count)],
    ['retailers', () => prisma.retailer.deleteMany({}).then(r => r.count)],
    ['developers (non-super-dev)', () => prisma.developer.deleteMany(excludedUsers).then(r => r.count)],
    ['sessions (non-super-dev)', () => prisma.session.deleteMany(excludedUsers).then(r => r.count)],
    ['users (non-super-dev)', () => prisma.user.deleteMany(excludedUserRows).then(r => r.count)],
    ['magic_link_tokens', () => prisma.magicLinkToken.deleteMany({}).then(r => r.count)],
    ['password_reset_tokens', () => prisma.passwordResetToken.deleteMany({}).then(r => r.count)],
  ];

  for (const [name, fn] of tables) {

    if (!DRY_RUN) {
      const n = await countTable(name, fn);
      report(n);
      continue;
    }
    // Dry-run: skip every delete; count instead via count().
    const modelName = name.split(' (')[0];
    const n = await countTable(name, async () => {
      // map table -> count delegate
      const countMap: Record<string, () => Promise<number>> = {
        ticket_messages: () => prisma.ticketMessage.count(),
        support_tickets: () => prisma.supportTicket.count(),
        activity_logs: () => prisma.activityLog.count(),
        notifications: () => prisma.notification.count(),
        subscription_payments: () => prisma.subscriptionPayment.count(),
        retailer_subscriptions: () => prisma.retailerSubscription.count(),
        order_items: () => prisma.orderItem.count(),
        orders: () => prisma.order.count(),
        payments: () => prisma.payment.count(),
        reviews: () => prisma.review.count(),
        wishlist_items: () => prisma.wishlistItem.count(),
        wishlists: () => prisma.wishlist.count(),
        cart_items: () => prisma.cartItem.count(),
        carts: () => prisma.cart.count(),
        product_variants: () => prisma.productVariant.count(),
        media: () => prisma.media.count(),
        product_downloads: () => prisma.productDownload.count(),
        products: () => prisma.product.count(),
        categories: () => prisma.category.count(),
        brands: () => prisma.brand.count(),
        store_emails: () => prisma.storeEmail.count(),
        store_themes: () => prisma.storeTheme.count(),
        store_settings: () => prisma.storeSettings.count(),
        coupons: () => prisma.coupon.count(),
        coupon_usage: () => prisma.couponUsage.count(),
        analytics_events: () => prisma.analyticsEvent.count(),
        ad_videos: () => prisma.adVideo.count(),
        addresses: () => prisma.address.count(),
        stores: () => prisma.store.count(),
        customers: () => prisma.customer.count(),
        retailers: () => prisma.retailer.count(),
        developers: () => prisma.developer.count({ where: excludedUsers.where }),
        sessions: () => prisma.session.count({ where: excludedUsers.where }),
        users: () => prisma.user.count({ where: excludedUserRows.where }),
        magic_link_tokens: () => prisma.magicLinkToken.count(),
        password_reset_tokens: () => prisma.passwordResetToken.count(),
      };
      return countMap[modelName]?.() ?? 0;
    });
    report(n);
  }

  console.log(`\nTotal rows affected: ${total}`);
  if (DRY_RUN) console.log('\nDRY-RUN only — nothing was deleted. Run without --dry-run to execute.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));