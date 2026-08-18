import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { ROLE_PERMISSIONS, Permission, UserRole } from '@nexus/shared';
import prisma from '@nexus/database';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// Short-TTL cache of user auth state (role, isActive) so every request does not
// hit the DB, while role changes still take effect quickly. Invalidated on
// explicit role/suspension changes via invalidateUserCache().
const USER_CACHE_TTL_MS = 60_000;
const userCache = new Map<string, { role: string; isActive: boolean; expiresAt: number }>();

export function invalidateUserCache(userId: string) {
  userCache.delete(userId);
}

export function clearUserCache() {
  userCache.clear();
}

async function loadUserAuth(userId: string): Promise<{ role: string; isActive: boolean }> {
  const cached = userCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { role: cached.role, isActive: cached.isActive };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });
  if (!user) {
    userCache.delete(userId);
    return { role: '', isActive: false };
  }
  const entry = { role: user.role, isActive: user.isActive, expiresAt: Date.now() + USER_CACHE_TTL_MS };
  userCache.set(userId, entry);
  return { role: entry.role, isActive: entry.isActive };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await loadUserAuth(payload.userId);
    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'Account suspended or inactive' });
    }
    // Serve authorization from the DB-fresh role, never the token claim alone.
    req.user = { ...payload, role: user.role };
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const payload = verifyAccessToken(authHeader.split(' ')[1]);
      const user = await loadUserAuth(payload.userId);
      if (user.isActive) req.user = { ...payload, role: user.role };
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    const role = req.user.role as UserRole;
    const userPermissions = ROLE_PERMISSIONS[role] || [];
    const hasAll = permissions.every(p => userPermissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    next();
  };
}