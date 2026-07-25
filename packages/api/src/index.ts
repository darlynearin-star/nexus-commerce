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
import { categoriesRouter } from './routes/categories';
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
import { resolveStore } from './middleware/resolve-store';
import { errorHandler } from './middleware/error-handler';
import { checkKillSwitch } from './middleware/kill-switch';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 4000;

// Security
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
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

// Store-scoped routes (require x-store-slug header)
app.use('/api/products', resolveStore, productsRouter);
app.use('/api/orders', resolveStore, ordersRouter);
app.use('/api/categories', resolveStore, categoriesRouter);
app.use('/api/cart', resolveStore, cartRouter);
app.use('/api/wishlist', resolveStore, wishlistRouter);
app.use('/api/reviews', resolveStore, reviewsRouter);
app.use('/api/coupons', resolveStore, couponsRouter);
app.use('/api/media', resolveStore, mediaRouter);
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Nexus Commerce API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;