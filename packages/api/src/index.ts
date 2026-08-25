import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { customersRouter } from './routes/customers';
import { categoriesRouter, seedStoreCategories } from './routes/categories';
import { cartRouter } from './routes/cart';
import { wishlistRouter } from './routes/wishlist';
import { reviewsRouter } from './routes/reviews';
import { couponsRouter } from './routes/coupons';
import { mediaRouter } from './routes/media';
import { adsRouter } from './routes/ads';
import { analyticsRouter } from './routes/analytics';
import { notificationsRouter } from './routes/notifications';
import { adminRouter } from './routes/admin';
import { settingsRouter } from './routes/settings';
import { searchRouter } from './routes/search';
import { killSwitchRouter } from './routes/kill-switch';
import { activityLogsRouter } from './routes/activity-logs';
import { systemRouter } from './routes/system';
import { storesRouter } from './routes/stores';
import { templatesRouter } from './routes/templates';
import { apiConfigRouter } from './routes/api-config';
import { subscriptionsRouter } from './routes/subscriptions';
import { paymentsRouter } from './routes/payments';
import { announcementsRouter } from './routes/announcements';
import { cacheRouter } from './routes/cache';
import { backupsRouter } from './routes/backups';
import { storeSettingsRouter } from './routes/store-settings';
import { uploadRouter } from './routes/upload';
import { storage } from './utils/storage';
import { runSubscriptionEnforcement } from './jobs/subscription-enforcer';
import { runRetentionSweeps } from './jobs/retention';

import { resolveStore } from './middleware/resolve-store';
import { errorHandler } from './middleware/error-handler';
import { checkKillSwitch } from './middleware/kill-switch';
import { authenticate } from './middleware/auth';
import prisma, { initDatabase, getDbStatus } from '@nexus/database';
import { logger, newRequestId } from './utils/logger';
import type { JijiCategory } from '@nexus/database';
import { mirrorToFallbackIfChanged, restoreFallbackIfEmpty, getFallbackClient } from './utils/db-mirror';
import { globalLimiter, authLimiter, loginLimiter } from './middleware/rate-limit';

const PORT = process.env.PORT || 4000;

// Startup migration: legacy drift-sync for DBs that predate Prisma migrations.
// This is a documented compatibility path, gated by RUN_LEGACY_MIGRATIONS
// (default on for existing deployments). New installs should use `prisma db push`
// or `prisma migrate deploy` instead — see packages/database/prisma/migrations.
async function runMigrations() {
  if (process.env.RUN_LEGACY_MIGRATIONS === 'false') {
    logger.info('Legacy migrations skipped (RUN_LEGACY_MIGRATIONS=false)');
    return;
  }
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''");
    logger.info('Migration: added phone column to store_settings');
    await prisma.$executeRawUnsafe("ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT ''");
    logger.info('Migration: added whatsapp column to store_settings');
    await prisma.$executeRawUnsafe("ALTER TABLE products ADD COLUMN IF NOT EXISTS \"shortCode\" TEXT");
    await prisma.$executeRawUnsafe("CREATE UNIQUE INDEX IF NOT EXISTS products_shortcode_idx ON products(\"shortCode\") WHERE \"shortCode\" IS NOT NULL");
    logger.info('Migration: added shortCode column to products');
    await prisma.$executeRawUnsafe("ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}'");
    logger.info('Migration: added images column to products');
    await prisma.$executeRawUnsafe('ALTER TABLE media ADD COLUMN IF NOT EXISTS data TEXT');
    logger.info('Migration: added data column to media (DB-backed uploads)');
    await prisma.$executeRawUnsafe('DO $$ BEGIN ALTER TABLE products ALTER COLUMN "categoryId" DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$');
    logger.info('Migration: made categoryId nullable on products');
    // Order table columns
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"customerPhone\" TEXT NOT NULL DEFAULT ''");
    logger.info('Migration: added customerPhone to orders');
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"shippingAddress\" TEXT NOT NULL DEFAULT ''");
    logger.info('Migration: added shippingAddress to orders');
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"paymentMethod\" TEXT NOT NULL DEFAULT 'pay_on_delivery'");
    logger.info('Migration: added paymentMethod to orders');
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"paymentStatus\" TEXT NOT NULL DEFAULT 'PENDING'");
    logger.info('Migration: added paymentStatus to orders');
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"trackingNumber\" TEXT");
    logger.info('Migration: added trackingNumber to orders');
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"estimatedDelivery\" TIMESTAMP");
    logger.info('Migration: added estimatedDelivery to orders');
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"deliveredAt\" TIMESTAMP");
    logger.info('Migration: added deliveredAt to orders');
    // Guest checkout: customerId nullable + guest contact columns
    await prisma.$executeRawUnsafe('DO $$ BEGIN ALTER TABLE orders ALTER COLUMN "customerId" DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$');
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"guestEmail\" TEXT NOT NULL DEFAULT ''");
    await prisma.$executeRawUnsafe("ALTER TABLE orders ADD COLUMN IF NOT EXISTS \"guestName\" TEXT NOT NULL DEFAULT ''");
    logger.info('Migration: added guest checkout columns to orders');
    // Auth: Google OAuth + magic links
    await prisma.$executeRawUnsafe('ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleId" TEXT');
    await prisma.$executeRawUnsafe('ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL');
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS users_googleid_key ON users("googleId") WHERE "googleId" IS NOT NULL');
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS magic_link_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      "expiresAt" TIMESTAMP NOT NULL,
      "usedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    )`);
    logger.info('Migration: added googleId + magic_link_tokens');
    // Password reset tokens
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      "expiresAt" TIMESTAMP NOT NULL,
      "usedAt" TIMESTAMP,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now()
    )`);
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS password_reset_tokens_email_idx ON password_reset_tokens(email)');
    logger.info('Migration: added password_reset_tokens');
    // Subscription auto-suspension grace tracking
    await prisma.$executeRawUnsafe('ALTER TABLE retailer_subscriptions ADD COLUMN IF NOT EXISTS "graceNotifiedAt" TIMESTAMP');
    await prisma.$executeRawUnsafe('ALTER TABLE retailer_subscriptions ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP');
    logger.info('Migration: added subscription grace/suspension tracking columns');
    await prisma.$executeRawUnsafe('ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS "customerNote" TEXT');
    logger.info('Migration: added customerNote to subscription_payments');
    // NotificationType enum: TIER_WARNING value is missing on databases created
    // before it existed in the schema (enum ADD VALUE is idempotent, safe on
    // Postgres 12+; executed here in autocommit so it also works on older PG).
    await prisma.$executeRawUnsafe('ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS \'TIER_WARNING\'');
    logger.info('Migration: added TIER_WARNING to NotificationType enum');
    // System actor: FK target for automated actions (enforcer notifications,
    // webhook/subscription audit logs) so the 'system' userId never violates
    // the users FK. Passwordless + inactive → it can never authenticate.
    try {
      await prisma.$executeRawUnsafe(`INSERT INTO users (id, email, "firstName", "lastName", role, "isActive", "emailVerified")
        VALUES ('system', 'system@lynnyx.internal', 'System', 'Actor', 'CUSTOMER', false, true)
        ON CONFLICT (id) DO NOTHING`);
      logger.info('Migration: ensured system actor user');
    } catch (e: any) {
      logger.warn(`System actor upsert skipped: ${e?.message || e}`);
    }
    // Search: pg_trgm trigram index on product searchable columns
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING gin (name gin_trgm_ops)');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS products_description_trgm_idx ON products USING gin (description gin_trgm_ops)');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS products_brand_trgm_idx ON products USING gin (brand gin_trgm_ops)');
    logger.info('Migration: added pg_trgm search indexes on products');
    // Ad Studio: jobs table (R2/S3 video storage reuses storage.ts; DB blob fallback)
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "ad_videos" (
      "id" TEXT PRIMARY KEY,
      "sourceUrl" TEXT NOT NULL,
      "templateId" TEXT NOT NULL,
      "format" TEXT NOT NULL DEFAULT '9:16',
      "status" TEXT NOT NULL DEFAULT 'QUEUED',
      "videoUrl" TEXT,
      "script" JSONB,
      "error" TEXT,
      "createdBy" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now()
    )`);
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ad_videos_status_idx" ON "ad_videos"("status")');
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "ad_videos_templateId_idx" ON "ad_videos"("templateId")');
    await prisma.$executeRawUnsafe('ALTER TABLE "ad_videos" ADD COLUMN IF NOT EXISTS "data" TEXT');
    logger.info('Migration: ensured ad_videos table');
    // H14: FK/hot-path indexes (Postgres does not auto-index FK columns).
    // Names match migrations/0010 so both paths create identical objects.
    const hotPathIndexes = [
      ['order_items_orderId_idx', 'order_items', '"orderId"'],
      ['order_items_productId_idx', 'order_items', '"productId"'],
      ['carts_storeId_customerId_idx', 'carts', '"storeId", "customerId"'],
      ['carts_storeId_sessionId_idx', 'carts', '"storeId", "sessionId"'],
      ['media_storeId_createdAt_idx', 'media', '"storeId", "createdAt"'],
      ['sessions_userId_isActive_idx', 'sessions', '"userId", "isActive"'],
      ['reviews_productId_createdAt_idx', 'reviews', '"productId", "createdAt"'],
      ['subscription_payments_subscriptionId_createdAt_idx', 'subscription_payments', '"subscriptionId", "createdAt"'],
      ['analytics_events_createdAt_idx', 'analytics_events', '"createdAt"'],
      ['analytics_events_eventType_createdAt_idx', 'analytics_events', '"eventType", "createdAt"'],
      ['analytics_events_sessionId_idx', 'analytics_events', '"sessionId"'],
      ['analytics_events_userId_idx', 'analytics_events', '"userId"'],
    ] as const;
    for (const [name, table, cols] of hotPathIndexes) {
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "${name}" ON "${table}" (${cols})`);
    }
    logger.info(`Migration: ensured ${hotPathIndexes.length} hot-path indexes`);
  } catch (e: any) {
    logger.warn(`Migrations skipped: ${e.message}`);
  }
}

// Factory so tests can mount the app without starting the listener (supertest).
export function createApp() {
const app = express();
app.set('trust proxy', 1); // Trust Render proxy for real visitor IPs (rate limiting, activity logs)

// Security
const cspConnectSrc = process.env.CSP_CONNECT_SRC || ["'self'", 'https://nexus-api-69q5.onrender.com'];
const cspImgSrc = process.env.CSP_IMG_SRC || ["'self'", 'data:', 'blob:', 'https://picsum.photos', 'https://res.cloudinary.com', 'https://nexus-api-69q5.onrender.com'];
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: cspImgSrc,
      connectSrc: cspConnectSrc,
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));
app.use((_req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
const corsAllowList = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'https://nexus-storefront-dusky.vercel.app', 'https://nexus-commerce-retailer-dashboard.vercel.app', 'https://nexus-commerce-developer-dashboard.vercel.app'];
const raw = process.env.CORS_ORIGIN;
app.use(cors({
  origin: raw === '*' ? (origin, cb) => cb(null, origin || '*') : ((raw?.split(',') || corsAllowList) as any),
  credentials: raw !== '*',
}));

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Logging (structured, with request ids for correlation)
app.use((req, res, next) => {
  const requestId = newRequestId();
  res.setHeader('X-Request-Id', requestId);
  const start = Date.now();
  res.on('finish', () => {
    logger.request({
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
});

// Rate limiting
app.use('/api', globalLimiter);

// Kill switch check (applied to all /api routes)
app.use('/api', checkKillSwitch);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// DB-backed uploads survive ephemeral host disks (Render wipes files on deploy).
// S3/R2-backed uploads are streamed from object storage when STORAGE_* is set.
app.get('/uploads/:storeId/:mediaId', async (req, res) => {
  try {
    const file = await storage.retrieve(req.params.storeId, req.params.mediaId);
    if (!file) return res.status(404).send('Not found');
    // Derive content type from the stored filename, not the client-supplied
    // mimetype, and force nosniff so a spoofed file can never execute inline.
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', file.type === 'document' ? 'inline; filename="' + encodeURIComponent(file.filename) + '"' : 'inline');
    res.setHeader('Content-Length', file.buffer.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(file.buffer);
  } catch {
    res.status(500).send('Server error');
  }
});

// Store-scoped routes (require x-store-slug header)
app.use('/api/products', resolveStore, productsRouter);
app.use('/api/orders', resolveStore, ordersRouter);
app.use('/api/categories', resolveStore, categoriesRouter);
app.get('/api/reseed-categories/:slug', authenticate, async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({ where: { slug: req.params.slug } });
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
    const user = (req as any).user;
    const isOwnerOrDev = user && (user.role === 'DEVELOPER' || user.role === 'SUPER_DEVELOPER' || store.ownerId === user.userId);
    if (!isOwnerOrDev) return res.status(403).json({ success: false, error: 'Forbidden' });
    await prisma.$executeRawUnsafe(`UPDATE "products" SET "categoryId" = NULL WHERE "storeId" = $1`, store.id);
    await prisma.category.deleteMany({ where: { storeId: store.id } });
    const count = await seedStoreCategories(store.id);
    res.json({ success: true, data: { deleted: true, created: count } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});
app.use('/api/cart', resolveStore, cartRouter);
app.use('/api/wishlist', resolveStore, wishlistRouter);
app.use('/api/reviews', resolveStore, reviewsRouter);
app.use('/api/coupons', resolveStore, couponsRouter);
app.use('/api/media', resolveStore, mediaRouter);
app.use('/api/upload', resolveStore, uploadRouter);
app.use('/api/analytics', resolveStore, analyticsRouter);
app.use('/api/search', resolveStore, searchRouter);
// Global routes (no store context needed)
app.use('/api/auth', authLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/kill-switch', killSwitchRouter);
app.use('/api/activity-logs', activityLogsRouter);
app.use('/api/system', systemRouter);
app.use('/api/stores', storesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/api-config', apiConfigRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/ads', adsRouter);
app.use('/api/cache', cacheRouter);
app.use('/api/backups', backupsRouter);
app.use('/api/store-settings', storeSettingsRouter);
// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// 404 handler
app.use('/api/*', (_req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found' });
});

// Error handling
app.use(errorHandler);

return app;
}

const app = createApp();
export default app;

if (require.main === module) {
app.listen(PORT, async () => {
  logger.info(`Lyn-nyx Stores API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  await initDatabase();
  const db = getDbStatus();
  logger.info(`Database: ${db.usingFallback ? 'FALLBACK ACTIVE' : 'primary'} (${db.activeUrl ? db.activeUrl.split('@').pop() : 'unset'})`);
  logger.info(`Database switching: ${db.manualSwitch ? 'MANUAL (dashboard controlled)' : 'AUTO'}`);
  await runMigrations();

  if (db.usingFallback) {
    logger.warn('FALLBACK DATABASE ACTIVE: orders and other writes made while on the fallback are NOT reconciled back to the primary. Treat this mode as degraded.');
    try {
      const result = await restoreFallbackIfEmpty(prisma);
      if (result.restored) logger.info(`Fallback restored ${result.tables.length} tables from mirrored snapshot`);
      else if (result.skipped) logger.info('Fallback already has data - restore skipped');
      else logger.warn('No mirrored snapshot found on fallback - running empty');
    } catch (e: any) {
      logger.warn(`Fallback restore failed: ${e?.message || e}`);
    }
  } else if (getFallbackClient()) {
    try {
      const result = await mirrorToFallbackIfChanged(prisma);
      if (result.mirrored) logger.info('Mirrored current database snapshot to fallback');
      else logger.info('Fallback snapshot already up to date - mirror skipped');
    } catch (e: any) {
      logger.warn(`Fallback mirror failed: ${e?.message || e}`);
}
  }

  // Subscription auto-suspension job: email grace notices, then suspend idle
  // stores whose unpaid grace period has elapsed. Runs on boot and every 6h.
  if (process.env.SUBSCRIPTION_ENFORCER_DISABLED !== 'true') {
    let enforcerRunning = false;
    const runEnforcer = async () => {
      if (enforcerRunning) return;
      enforcerRunning = true;
      try {
        await runSubscriptionEnforcement();
      } catch (e: any) {
        logger.warn(`Subscription enforcer error: ${e?.message || e}`);
      } finally {
        enforcerRunning = false;
      }
    };
    void runEnforcer();
    setInterval(runEnforcer, 6 * 60 * 60 * 1000).unref();
  }

  // M-prune: bound ever-growing tables (analytics, activity logs, read
  // notifications, dead sessions). Runs on boot and daily.
  if (process.env.RETENTION_DISABLED !== 'true') {
    let retentionRunning = false;
    const runRetention = async () => {
      if (retentionRunning) return;
      retentionRunning = true;
      try {
        await runRetentionSweeps();
      } catch (e: any) {
        logger.warn(`Retention job error: ${e?.message || e}`);
      } finally {
        retentionRunning = false;
      }
    };
    void runRetention();
    setInterval(runRetention, 24 * 60 * 60 * 1000).unref();
  }
});
}