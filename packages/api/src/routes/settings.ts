import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const settingsRouter = Router();

settingsRouter.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const result: Record<string, any> = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

settingsRouter.put('/', authenticate, requirePermission(Permission.MANAGE_SETTINGS), async (req: AuthRequest, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
    }
    logActivity({ userId: req.user!.userId, action: 'settings:modified', resource: 'settings', details: { updated: Object.keys(updates) }, req: req as any });
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) { next(error); }
});