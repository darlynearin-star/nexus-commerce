import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';

export const migrateRouter = Router();

migrateRouter.post('/db-sync', authenticate, async (req, res, next) => {
  try {
    const user = (req as any).user;
    if (user?.role !== 'SUPER_DEVELOPER') {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const results: string[] = [];

    await prisma.$executeRawUnsafe("ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT ''");
    results.push('Added phone to store_settings');

    await prisma.$executeRawUnsafe("ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT ''");
    results.push('Added whatsapp to store_settings');

    await prisma.$executeRawUnsafe("ALTER TABLE store_themes ADD COLUMN IF NOT EXISTS animation TEXT NOT NULL DEFAULT 'subtle'");
    results.push('Added animation to store_themes');

    res.json({ success: true, data: { messages: results } });
  } catch (error) {
    next(error);
  }
});
