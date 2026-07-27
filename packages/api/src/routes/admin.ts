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

const ALLOWED_USER_FIELDS = ['email', 'firstName', 'lastName', 'isActive'];
adminRouter.put('/users/:id', authenticate, requirePermission(Permission.MANAGE_USERS), async (req: AuthRequest, res, next) => {
  try {
    const data: any = {};
    for (const key of ALLOWED_USER_FIELDS) { if (req.body[key] !== undefined) data[key] = req.body[key]; }
    if (req.body.password) data.passwordHash = await require('bcryptjs').hash(req.body.password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data });
    logActivity({ userId: req.user!.userId, action: 'user:updated', resource: 'user', resourceId: user.id, details: { changes: Object.keys(data) }, req: req as any });
    res.json({ success: true, data: { ...user, passwordHash: undefined } });
  } catch (error) { next(error); }
});

const ALLOWED_CREATE_FIELDS = ['email', 'firstName', 'lastName', 'role'];
adminRouter.post('/users', authenticate, requirePermission(Permission.MANAGE_USERS), async (req: AuthRequest, res, next) => {
  try {
    const bcrypt = require('bcryptjs');
    const password = req.body.password || 'Password123!';
    if (password === 'Password123!') console.warn('Using default password - user should change on first login');
    const passwordHash = await bcrypt.hash(password, 10);
    const data: any = {};
    for (const key of ALLOWED_CREATE_FIELDS) data[key] = req.body[key];
    data.passwordHash = passwordHash;
    data.emailVerified = true;
    const user = await prisma.user.create({ data });
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

adminRouter.post('/repair/store-ownership', authenticate, requirePermission(Permission.MANAGE_USERS), async (req: AuthRequest, res, next) => {
  try {
    const { userId, storeSlug } = req.body;
    if (!userId || !storeSlug) return res.status(400).json({ success: false, error: 'userId and storeSlug are required' });

    const store = await prisma.store.findUnique({ where: { slug: storeSlug } });
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });

    await prisma.store.update({ where: { id: store.id }, data: { isActive: true } });

    await prisma.retailer.upsert({
      where: { userId },
      create: { userId, storeName: store.name, storeSlug: store.slug },
      update: { storeName: store.name, storeSlug: store.slug },
    });

    await prisma.user.update({ where: { id: userId }, data: { role: 'RETAILER' } });

    logActivity({ userId: req.user!.userId, action: 'store:ownership-repaired', resource: 'store', resourceId: store.id, details: { userId, storeSlug }, req: req as any });
    res.json({ success: true, message: `Store "${storeSlug}" activated and assigned to user ${userId}` });
  } catch (error) { next(error); }
});

adminRouter.post('/repair/all-store-ownerships', authenticate, requirePermission(Permission.MANAGE_USERS), async (req: AuthRequest, res, next) => {
  try {
    const stores = await prisma.store.findMany({ where: { isActive: true } });
    const results: any[] = [];

    for (const store of stores) {
      const retailer = await prisma.retailer.findUnique({ where: { storeSlug: store.slug } });
      if (!retailer) {
        await prisma.retailer.create({ data: { userId: store.ownerId, storeName: store.name, storeSlug: store.slug } });
        await prisma.user.update({ where: { id: store.ownerId }, data: { role: 'RETAILER' } });
        results.push({ storeSlug: store.slug, action: 'created-retailer' });
      } else {
        results.push({ storeSlug: store.slug, action: 'already-has-retailer' });
      }
    }

    res.json({ success: true, data: results });
  } catch (error) { next(error); }
});