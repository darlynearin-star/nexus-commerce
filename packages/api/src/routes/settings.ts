import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const settingsRouter = Router();

// Global platform settings (incl. secrets/backups view) — developer-only.
// RETAILER's own store settings live under /store-settings (requireStoreOwner).
settingsRouter.get('/', authenticate, requireRole(UserRole.SUPER_DEVELOPER, UserRole.DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    const settings = await prisma.setting.findMany();
    const result: Record<string, any> = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
});

settingsRouter.put('/', authenticate, requireRole(UserRole.SUPER_DEVELOPER, UserRole.DEVELOPER), async (req: AuthRequest, res, next) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
    }
    logActivity({ userId: req.user!.userId, action: 'settings:modified', resource: 'settings', details: { updated: Object.keys(updates) }, req: req as any });
    res.json({ success: true, message: 'Settings updated' });
  } catch (error) { next(error); }
});