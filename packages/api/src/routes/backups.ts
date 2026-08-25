import { Router } from 'express';
import prisma from '@nexus/database';
import { UserRole } from '@nexus/shared';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';
import { mirrorToFallback } from '../utils/db-mirror';

export const backupsRouter = Router();

// H8 dump policy:
// - `media` EXCLUDED — its base64 blobs dominate dump size (a handful of 5MB
//   uploads previously made every backup a multi-MB settings-row write).
// - `sessions` EXCLUDED — ephemeral auth state (dead tokens after restore)
//   and churn that only inflates every snapshot.
// Everything else is disaster-recovery data and stays.
const BACKUP_TABLES = ['users', 'customers', 'retailers', 'developers', 'stores', 'store_settings', 'store_themes',
  'products', 'product_variants', 'categories', 'brands', 'orders', 'order_items', 'payments',
  'carts', 'cart_items', 'reviews', 'wishlists', 'wishlist_items', 'coupons',
  'addresses', 'notifications', 'support_tickets', 'ticket_messages',
  'retailer_subscriptions', 'subscription_payments'];

// Retention: keep the newest N backups (bounded settings row). 1–20, default 5.
function retentionLimit(): number {
  const n = parseInt(process.env.BACKUP_RETENTION || '5', 10);
  return Number.isFinite(n) ? Math.min(20, Math.max(1, n)) : 5;
}

// Hard ceiling for one serialized snapshot — past this, the settings-row
// storage model is the wrong tool (use R2/object storage instead).
const MAX_BACKUP_BYTES = 25 * 1024 * 1024;

backupsRouter.get('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (_req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'database_backups' } });
    const backups = (setting?.value as any[]) || [];
    res.json({ success: true, data: backups.map(({ data, ...meta }) => meta) });
  } catch (error) { next(error); }
});

backupsRouter.post('/create', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const dump: any = {};
    for (const table of BACKUP_TABLES) {
      try { dump[table] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`); }
      catch { dump[table] = []; }
    }

    const serialized = JSON.stringify(dump);
    if (serialized.length > MAX_BACKUP_BYTES) {
      return res.status(413).json({
        success: false,
        error: `Backup too large to store in the database (${Math.round(serialized.length / 1048576)}MB > ${Math.round(MAX_BACKUP_BYTES / 1048576)}MB cap). Configure R2/S3 object storage for full backups.`,
      });
    }

    const backup = {
      id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      createdBy: (req as any).user!.userId,
      tableCount: BACKUP_TABLES.length,
      rowCount: Object.values(dump).reduce((sum: number, rows: any) => sum + (rows?.length || 0), 0),
      size: serialized.length,
      data: dump,
    };

    const setting = await prisma.setting.findUnique({ where: { key: 'database_backups' } });
    const backups: any[] = (setting?.value as any[]) || [];
    backups.push({ ...backup });
    // Retention: keep only the newest N so the settings row stays bounded.
    const kept = backups.slice(-retentionLimit());
    const dropped = backups.length - kept.length;
    await prisma.setting.upsert({
      where: { key: 'database_backups' },
      update: { value: kept },
      create: { key: 'database_backups', value: kept },
    });

    logActivity({ userId: (req as any).user!.userId, action: 'backup:created', resource: 'backup', resourceId: backup.id, details: { rowCount: backup.rowCount, size: backup.size, dropped }, req: req as any });
    // Metadata only — the full dump is fetchable via /:id/download.
    res.json({ success: true, data: { id: backup.id, createdAt: backup.createdAt, tableCount: backup.tableCount, rowCount: backup.rowCount, size: backup.size, dropped } });

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
    res.json({ success: true, data: filtered.map(({ data, ...meta }: any) => meta) });
  } catch (error) { next(error); }
});
