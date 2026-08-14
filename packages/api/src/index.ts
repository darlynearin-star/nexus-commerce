import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
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

import { resolveStore } from './middleware/resolve-store';
import { errorHandler } from './middleware/error-handler';
import { checkKillSwitch } from './middleware/kill-switch';
import { authenticate } from './middleware/auth';
import prisma, { initDatabase, getDbStatus } from '@nexus/database';
import { logger } from './utils/logger';
import type { JijiCategory } from '@nexus/database';
import { mirrorToFallbackIfChanged, restoreFallbackIfEmpty, getFallbackClient } from './utils/db-mirror';

// Startup migration: sync DB columns that Prisma schema needs
async function runMigrations() {
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
  } catch (e: any) {
    logger.warn(`Migrations skipped: ${e.message}`);
  }
}

const app = express();
app.set('trust proxy', 1); // Trust Render proxy for real visitor IPs (rate limiting, activity logs)
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://picsum.photos', 'https://res.cloudinary.com', 'https://nexus-api-69q5.onrender.com'],
      connectSrc: ["'self'", 'https://nexus-api-69q5.onrender.com'],
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

// Logging
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Kill switch check (applied to all /api routes)
app.use('/api', checkKillSwitch);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// DB-backed uploads survive ephemeral host disks (Render wipes files on deploy).
app.get('/uploads/:storeId/:mediaId', async (req, res) => {
  try {
    const media = await prisma.media.findFirst({ where: { id: req.params.mediaId, storeId: req.params.storeId } });
    if (!media || !media.data) return res.status(404).send('Not found');
    const buf = Buffer.from(media.data, 'base64');
    res.setHeader('Content-Type', media.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(buf);
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

app.listen(PORT, async () => {
  logger.info(`Lyn-nyx Stores API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  await initDatabase();
  const db = getDbStatus();
  logger.info(`Database: ${db.usingFallback ? 'FALLBACK ACTIVE' : 'primary'} (${db.activeUrl ? db.activeUrl.split('@').pop() : 'unset'})`);
  logger.info(`Database switching: ${db.manualSwitch ? 'MANUAL (dashboard controlled)' : 'AUTO'}`);
  await runMigrations();

  if (db.usingFallback) {
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
});

export default app;