import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission, UserRole } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const adminRouter = Router();

adminRouter.get('/users', authenticate, requirePermission(Permission.MANAGE_USERS), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { customer: true, retailer: true, developer: true, _count: { select: { sessions: { where: { isActive: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: users.map(({ passwordHash, ...u }) => u) });
  } catch (error) { next(error); }
});

adminRouter.put('/users/:id', authenticate, requirePermission(Permission.MANAGE_USERS), async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
    logActivity({ userId: req.user!.userId, action: 'user:updated', resource: 'user', resourceId: user.id, details: { changes: Object.keys(req.body) }, req: req as any });
    res.json({ success: true, data: { ...user, passwordHash: undefined } });
  } catch (error) { next(error); }
});

adminRouter.post('/users', authenticate, requirePermission(Permission.MANAGE_USERS), async (req: AuthRequest, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const passwordHash = await bcrypt.hash(req.body.password || 'Password123!', 10);
    const user = await prisma.user.create({ data: { ...req.body, passwordHash, emailVerified: true } });
    if (user.role === 'CUSTOMER') await prisma.customer.create({ data: { userId: user.id } });
    if (user.role === 'RETAILER') await prisma.retailer.create({ data: { userId: user.id, storeName: `${user.firstName}'s Store`, storeSlug: `${user.firstName.toLowerCase()}-store` } });
    if (user.role === 'DEVELOPER' || user.role === 'SUPER_DEVELOPER') await prisma.developer.create({ data: { userId: user.id } });
    logActivity({ userId: req.user!.userId, action: 'user:created', resource: 'user', resourceId: user.id, req: req as any });
    res.status(201).json({ success: true, data: { ...user, passwordHash: undefined } });
  } catch (error) { next(error); }
});

adminRouter.delete('/users/:id', authenticate, requirePermission(Permission.MANAGE_USERS), async (req: AuthRequest, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    logActivity({ userId: req.user!.userId, action: 'user:deleted', resource: 'user', resourceId: req.params.id, req: req as any });
    res.json({ success: true, message: 'User suspended' });
  } catch (error) { next(error); }
});