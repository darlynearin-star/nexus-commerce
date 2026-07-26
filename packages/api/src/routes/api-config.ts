import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const apiConfigRouter = Router();

const KEY_PREFIXES = ['GOOGLE_', 'FACEBOOK_', 'APPLE_', 'GITHUB_', 'CLOUDINARY_', 'AWS_', 'FIREBASE_', 'SUPABASE_', 'STRIPE_', 'FLUTTERWAVE_', 'PAYSTACK_', 'AIRTEL_', 'MTN_', 'PESAPAL_', 'SMTP_', 'RESEND_', 'MAILGUN_', 'TWILIO_', 'OPENAI_', 'ANTHROPIC_', 'GOOGLE_GEMINI_', 'HUGGINGFACE_', 'MAPBOX_', 'GOOGLE_MAPS_', 'RECAPTCHA_', 'CLOUDFLARE_', 'ANALYTICS_', 'SENTRY_', 'REDIS_'];

const ALL_KEYS = [
  'GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_OAUTH_CLIENT_SECRET',
  'FACEBOOK_OAUTH_CLIENT_ID', 'FACEBOOK_OAUTH_CLIENT_SECRET',
  'APPLE_SIGN_IN_CLIENT_ID', 'APPLE_SIGN_IN_KEY_ID', 'APPLE_SIGN_IN_TEAM_ID',
  'GITHUB_OAUTH_CLIENT_ID', 'GITHUB_OAUTH_CLIENT_SECRET',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_S3_REGION', 'AWS_S3_BUCKET',
  'FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY',
  'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY',
  'STRIPE_PUBLISHABLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET',
  'FLUTTERWAVE_PUBLIC_KEY', 'FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_WEBHOOK_SECRET',
  'PAYSTACK_PUBLIC_KEY', 'PAYSTACK_SECRET_KEY',
  'AIRTEL_MONEY_API_KEY', 'AIRTEL_MONEY_USERNAME',
  'MTN_MOMO_API_KEY', 'MTN_MOMO_API_USER', 'MTN_MOMO_SUBSCRIPTION_KEY',
  'PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
  'RESEND_API_KEY',
  'MAILGUN_API_KEY', 'MAILGUN_DOMAIN',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'HUGGINGFACE_API_KEY',
  'MAPBOX_ACCESS_TOKEN',
  'GOOGLE_MAPS_API_KEY',
  'RECAPTCHA_SITE_KEY', 'RECAPTCHA_SECRET_KEY',
  'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ZONE_ID',
  'ANALYTICS_GA_ID',
  'SENTRY_DSN',
  'REDIS_URL',
  ...KEY_PREFIXES.map(p => `${p}ENABLED`),
  ...KEY_PREFIXES.map(p => `${p}LAST_TESTED`),
];

apiConfigRouter.get('/', authenticate, requirePermission(Permission.MANAGE_SETTINGS), async (_req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ where: { key: { in: ALL_KEYS } } });
    const config: Record<string, any> = {};
    for (const s of settings) config[s.key] = s.value;
    res.json({ success: true, data: config, keys: ALL_KEYS });
  } catch (error) { next(error); }
});

apiConfigRouter.put('/', authenticate, requirePermission(Permission.MANAGE_SETTINGS), async (req: AuthRequest, res, next) => {
  try {
    const bodyKeys = Object.keys(req.body).filter(k => ALL_KEYS.includes(k));
    for (const key of bodyKeys) {
      await prisma.setting.upsert({ where: { key }, create: { key, value: req.body[key] }, update: { value: req.body[key] } });
    }
    logActivity({ userId: req.user!.userId, action: 'api-config:updated', resource: 'api-config', details: { keys: bodyKeys }, req: req as any });
    res.json({ success: true, message: `${bodyKeys.length} key(s) saved` });
  } catch (error) { next(error); }
});

apiConfigRouter.post('/test/:key', authenticate, requirePermission(Permission.MANAGE_SETTINGS), async (req: AuthRequest, res, next) => {
  try {
    const { key } = req.params;
    const [provider] = key.split('_');
    const result = { key, success: false, message: 'Test not implemented for this provider', timestamp: new Date().toISOString() };

    if (key.startsWith('FLUTTERWAVE_')) {
      const secret = await prisma.setting.findUnique({ where: { key: 'FLUTTERWAVE_SECRET_KEY' } });
      if (secret?.value) {
        const r = await fetch('https://api.flutterwave.com/v3/transactions?page=1', { headers: { Authorization: `Bearer ${secret.value}` } });
        result.success = r.status === 200;
        result.message = r.ok ? 'Connected to Flutterwave API' : `HTTP ${r.status}`;
      } else result.message = 'Secret key not configured';
    } else if (key.startsWith('OPENAI')) {
      const apiKey = await prisma.setting.findUnique({ where: { key: 'OPENAI_API_KEY' } });
      if (apiKey?.value) {
        const r = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${apiKey.value}` } });
        result.success = r.status === 200;
        result.message = r.ok ? 'Connected to OpenAI' : `HTTP ${r.status}`;
      } else result.message = 'API key not configured';
    } else if (key.startsWith('STRIPE_')) {
      const secret = await prisma.setting.findUnique({ where: { key: 'STRIPE_SECRET_KEY' } });
      if (secret?.value) {
        const r = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${secret.value}` } });
        result.success = r.status === 200;
        result.message = r.ok ? 'Connected to Stripe' : `HTTP ${r.status}`;
      } else result.message = 'Secret key not configured';
    } else if (key.startsWith('SMTP')) {
      result.message = 'SMTP test requires actual email send — verify via Settings > Email';
    } else if (key.startsWith('RECAPTCHA')) {
      const siteKey = await prisma.setting.findUnique({ where: { key: 'RECAPTCHA_SITE_KEY' } });
      result.success = !!siteKey?.value;
      result.message = siteKey?.value ? 'reCAPTCHA site key configured' : 'Site key not configured';
    } else if (key.startsWith('CLOUDINARY')) {
      const cloud = await prisma.setting.findUnique({ where: { key: 'CLOUDINARY_CLOUD_NAME' } });
      const apiKey = await prisma.setting.findUnique({ where: { key: 'CLOUDINARY_API_KEY' } });
      const apiSecret = await prisma.setting.findUnique({ where: { key: 'CLOUDINARY_API_SECRET' } });
      if (cloud?.value && apiKey?.value && apiSecret?.value) {
        const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud.value}/ping`);
        result.success = r.status === 200;
        result.message = r.ok ? 'Connected to Cloudinary' : `HTTP ${r.status}`;
      } else result.message = 'Missing Cloudinary credentials';
    } else if (key.startsWith('SENTRY')) {
      const dsn = await prisma.setting.findUnique({ where: { key: 'SENTRY_DSN' } });
      result.success = !!dsn?.value;
      result.message = dsn?.value ? 'Sentry DSN configured' : 'DSN not configured';
    } else if (key.startsWith('REDIS')) {
      result.message = 'Redis test requires server-side connection — check System Health';
    } else {
      const setting = await prisma.setting.findUnique({ where: { key } });
      result.success = !!setting?.value;
      result.message = setting?.value ? 'Key is configured' : 'Key not configured';
    }

    const lastKey = `${key}_LAST_TESTED`;
    await prisma.setting.upsert({ where: { key: lastKey }, create: { key: lastKey, value: result.timestamp }, update: { value: result.timestamp } });

    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});
