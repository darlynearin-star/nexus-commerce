import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const apiConfigRouter = Router();

const CONFIG_KEYS = ['FLUTTERWAVE_SECRET_KEY', 'MTN_MOMO_API_KEY', 'MTN_MOMO_API_USER', 'AIRTEL_MONEY_API_KEY', 'AIRTEL_MONEY_USERNAME', 'PLATFORM_EMAIL_FROM', 'PLATFORM_EMAIL_HOST', 'PLATFORM_EMAIL_PORT'];

apiConfigRouter.get('/', authenticate, requirePermission(Permission.MANAGE_SETTINGS), async (_req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.setting.findMany({ where: { key: { in: CONFIG_KEYS } } });
    const config: Record<string, any> = {};
    for (const s of settings) config[s.key] = s.value;
    res.json({ success: true, data: config });
  } catch (error) { next(error); }
});

apiConfigRouter.put('/', authenticate, requirePermission(Permission.MANAGE_SETTINGS), async (req: AuthRequest, res, next) => {
  try {
    const updates: { key: string; value: any }[] = [];
    for (const key of CONFIG_KEYS) {
      if (req.body[key] !== undefined) {
        await prisma.setting.upsert({ where: { key }, create: { key, value: req.body[key] }, update: { value: req.body[key] } });
        updates.push({ key, value: req.body[key] });
      }
    }
    logActivity({ userId: req.user!.userId, action: 'api-config:updated', resource: 'api-config', details: { keys: updates.map(u => u.key) }, req: req as any });
    res.json({ success: true, data: updates });
  } catch (error) { next(error); }
});
