import { Router } from 'express';
import { UserRole } from '@nexus/shared';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';

interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  createdAt: number;
}

const memoryCache: Map<string, CacheEntry> = new Map();

export function cacheGet(key: string): any | undefined {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.createdAt > entry.ttl) { memoryCache.delete(key); return undefined; }
  return entry.value;
}

export function cacheSet(key: string, value: any, ttlMs: number = 60000) {
  memoryCache.set(key, { key, value, ttl: ttlMs, createdAt: Date.now() });
}

export const cacheRouter = Router();

cacheRouter.get('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (_req, res, next) => {
  try {
    const now = Date.now();
    const entries = Array.from(memoryCache.entries()).map(([key, entry]) => ({
      key, ttl: entry.ttl, age: now - entry.createdAt, expired: now - entry.createdAt > entry.ttl,
    }));
    const stats = { totalEntries: entries.length, activeEntries: entries.filter(e => !e.expired).length, expiredEntries: entries.filter(e => e.expired).length };
    res.json({ success: true, data: { stats, entries } });
  } catch (error) { next(error); }
});

cacheRouter.delete('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const key = req.query.key as string;
    if (key) { memoryCache.delete(key); logActivity({ userId: (req as any).user!.userId, action: 'cache:cleared', resource: 'cache', details: { key }, req: req as any }); }
    else { memoryCache.clear(); logActivity({ userId: (req as any).user!.userId, action: 'cache:flushed', resource: 'cache', req: req as any }); }
    res.json({ success: true, message: key ? `Cache entry '${key}' cleared` : 'All cache cleared' });
  } catch (error) { next(error); }
});
