import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const apiConfigRouter = Router();

const KEY_PREFIXES = ['FLUTTERWAVE_', 'PESAPAL_', 'RESEND_', 'BREVO_', 'GMAIL_', 'GOOGLE_', 'AUTH_'];

const ALL_KEYS = [
  'FLUTTERWAVE_PUBLIC_KEY', 'FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_WEBHOOK_SECRET',
  'PESAPAL_CONSUMER_KEY', 'PESAPAL_CONSUMER_SECRET', 'PESAPAL_IPN_URL', 'PESAPAL_BASE_URL',
  'RESEND_API_KEY', 'RESEND_FROM_EMAIL',
  'BREVO_API_KEY', 'BREVO_SMTP_LOGIN', 'BREVO_SMTP_KEY', 'BREVO_FROM_EMAIL', 'BREVO_FROM_NAME',
  'GMAIL_USER', 'GMAIL_APP_PASSWORD', 'GMAIL_FROM_EMAIL',
  'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET',
  'AUTH_REDIRECT_URL',
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
    const result = { key, success: false, message: 'Test not implemented for this provider', timestamp: new Date().toISOString() };

    if (key.startsWith('FLUTTERWAVE_')) {
      const secret = await prisma.setting.findUnique({ where: { key: 'FLUTTERWAVE_SECRET_KEY' } });
      if (secret?.value) {
        const r = await fetch('https://api.flutterwave.com/v3/transactions?page=1', { headers: { Authorization: `Bearer ${secret.value}` } });
        result.success = r.status === 200;
        result.message = r.ok ? 'Connected to Flutterwave API' : `HTTP ${r.status}`;
      } else result.message = 'Secret key not configured';
    } else if (key === 'PESAPAL_CONSUMER_KEY') {
      const consumerKey = await prisma.setting.findUnique({ where: { key: 'PESAPAL_CONSUMER_KEY' } });
      const consumerSecret = await prisma.setting.findUnique({ where: { key: 'PESAPAL_CONSUMER_SECRET' } });
      if (consumerKey?.value && consumerSecret?.value) {
        try {
          const base = process.env.PESAPAL_BASE_URL || 'https://pay.pesapal.com';
          const r = await fetch(`${base}/v3/api/Auth/RequestToken`, {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ consumer_key: consumerKey.value, consumer_secret: consumerSecret.value }),
          });
          const data: any = await r.json();
          result.success = r.ok && !!data.token;
          result.message = result.success ? 'Connected to Pesapal API' : `HTTP ${r.status}: ${data.error?.message || data.message || 'Invalid credentials'}`;
        } catch (e: any) {
          result.message = `Connection failed: ${e.message}`;
        }
      } else result.message = 'Consumer key and secret required';
    } else if (key === 'RESEND_API_KEY') {
      const value = await prisma.setting.findUnique({ where: { key: 'RESEND_API_KEY' } });
      if (value?.value) {
        const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: `Bearer ${value.value}` } });
        result.success = r.status === 200;
        result.message = r.ok ? 'Connected to Resend API' : `HTTP ${r.status}`;
      } else result.message = 'API key not configured';
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
