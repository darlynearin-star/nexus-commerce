import { Router } from 'express';
import prisma from '@nexus/database';
import { UserRole } from '@nexus/shared';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';
import { mirrorToFallback } from '../utils/db-mirror';

export const backupsRouter = Router();

backupsRouter.get('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (_req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'database_backups' } });
    const backups = (setting?.value as any[]) || [];
    res.json({ success: true, data: backups.map(({ data, ...meta }) => meta) });
  } catch (error) { next(error); }
});

backupsRouter.post('/create', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const tables = ['users', 'customers', 'retailers', 'developers', 'stores', 'store_settings', 'store_themes',
      'products', 'product_variants', 'categories', 'brands', 'orders', 'order_items', 'payments',
      'carts', 'cart_items', 'reviews', 'wishlists', 'wishlist_items', 'coupons', 'media',
      'addresses', 'sessions', 'notifications', 'activity_logs', 'support_tickets', 'ticket_messages',
      'retailer_subscriptions', 'subscription_payments'];

    const dump: any = {};
    for (const table of tables) {
      try { dump[table] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`); }
      catch { dump[table] = []; }
    }

    const backup = {
      id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      createdBy: (req as any).user!.userId,
      tableCount: tables.length,
      rowCount: Object.values(dump).reduce((sum: number, rows: any) => sum + (rows?.length || 0), 0),
      size: JSON.stringify(dump).length,
      data: dump,
    };

    const setting = await prisma.setting.findUnique({ where: { key: 'database_backups' } });
    const backups: any[] = (setting?.value as any[]) || [];
    backups.push({ ...backup });
    await prisma.setting.upsert({
      where: { key: 'database_backups' },
      update: { value: backups },
      create: { key: 'database_backups', value: backups },
    });

    logActivity({ userId: (req as any).user!.userId, action: 'backup:created', resource: 'backup', resourceId: backup.id, details: { rowCount: backup.rowCount }, req: req as any });
    res.json({ success: true, data: { id: backup.id, createdAt: backup.createdAt, tableCount: backup.tableCount, rowCount: backup.rowCount, size: backup.size, data: dump } });

    mirrorToFallback(prisma).catch(() => {});
  } catch (error) { next(error); }
});

backupsRouter.get('/:id/download', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'database_backups' } });
    const backups: any[] = (setting?.value as any[]) || [];
    const backup = backups.find((b: any) => b.id === req.params.id);
    if (!backup) return res.status(404).json({ success: false, error: 'Backup not found' });
    res.json({ success: true, data: backup });
  } catch (error) { next(error); }
});

backupsRouter.delete('/:id', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'database_backups' } });
    const backups: any[] = (setting?.value as any[]) || [];
    const filtered = backups.filter((b: any) => b.id !== req.params.id);
    await prisma.setting.upsert({
      where: { key: 'database_backups' },
      update: { value: filtered },
      create: { key: 'database_backups', value: filtered },
    });
    logActivity({ userId: (req as any).user!.userId, action: 'backup:deleted', resource: 'backup', resourceId: req.params.id, req: req as any });
    res.json({ success: true, data: filtered });
  } catch (error) { next(error); }
});
