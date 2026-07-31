import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';
import { ROLE_PERMISSIONS, Permission, UserRole } from '@nexus/shared';
import prisma from '@nexus/database';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, isActive: true } });
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, error: 'Account suspended or inactive' });
    }
    req.user = payload;
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
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, isActive: true } });
      if (user?.isActive) req.user = payload;
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