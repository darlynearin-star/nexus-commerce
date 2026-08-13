import { Request, Response, NextFunction } from 'express';
import prisma from '@nexus/database';
import { AuthRequest } from './auth';

export interface StoreRequest extends Request {
  storeId?: string;
  store?: any;
}

export async function resolveStore(req: StoreRequest, _res: Response, next: NextFunction) {
  try {
    const slug = req.headers['x-store-slug'] as string;
    if (!slug) return next();

    const store = await prisma.store.findUnique({
      where: { slug },
      include: { settings: true, theme: true },
    });

    if (!store) return _res.status(404).json({ success: false, error: 'Store not found' });
    if (!store.isActive) return _res.status(503).json({ success: false, error: 'Store is currently disabled' });

    req.storeId = store.id;
    req.store = store;
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireStore(req: StoreRequest, res: Response, next: NextFunction) {
  await resolveStore(req, res, () => {
    if (!req.storeId) return res.status(400).json({ success: false, error: 'x-store-slug header is required' });
    next();
  });
}

// Guards store-scoped management routes: only the store owner (or a platform
// developer/admin) may mutate records. Must run AFTER authenticate +
// resolveStore so req.user and req.store are populated.
export async function requireStoreOwner(req: StoreRequest & AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
  if (req.user.role === 'DEVELOPER' || req.user.role === 'SUPER_DEVELOPER') return next();
  if (!req.store) return res.status(400).json({ success: false, error: 'x-store-slug header is required' });
  if (req.store.ownerId !== req.user.userId) {
    return res.status(403).json({ success: false, error: 'You do not have permission to manage this store' });
  }
  next();
}
