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

adminRouter.delete('/stores/:id', authenticate, requirePermission(Permission.MANAGE_SYSTEM), async (req: AuthRequest, res, next) => {
  try {
    const store = await prisma.store.findUnique({ where: { id: req.params.id } });
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });

    const orderIds = (await prisma.order.findMany({ where: { storeId: store.id }, select: { id: true } })).map(o => o.id);
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { storeId: store.id } });

    const cartIds = (await prisma.cart.findMany({ where: { storeId: store.id }, select: { id: true } })).map(c => c.id);
    await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
    await prisma.cart.deleteMany({ where: { storeId: store.id } });

    await prisma.retailer.deleteMany({ where: { storeSlug: store.slug } });

    await prisma.store.delete({ where: { id: store.id } });

    logActivity({ userId: req.user!.userId, action: 'store:deleted', resource: 'store', resourceId: store.id, details: { name: store.name, slug: store.slug }, req: req as any });
    res.json({ success: true, message: `Store "${store.name}" (${store.slug}) deleted` });
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

adminRouter.post('/cleanup', authenticate, requirePermission(Permission.MANAGE_SYSTEM), async (req: AuthRequest, res, next) => {
  try {
    const adminEmail = 'admin@nexuscommerce.com';

    const allStores = await prisma.store.findMany({ select: { id: true, name: true, slug: true } });
    for (const store of allStores) {
      const orderIds = (await prisma.order.findMany({ where: { storeId: store.id }, select: { id: true } })).map(o => o.id);
      await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await prisma.order.deleteMany({ where: { storeId: store.id } });

      const cartIds = (await prisma.cart.findMany({ where: { storeId: store.id }, select: { id: true } })).map(c => c.id);
      await prisma.cartItem.deleteMany({ where: { cartId: { in: cartIds } } });
      await prisma.cart.deleteMany({ where: { storeId: store.id } });

      await prisma.retailer.deleteMany({ where: { storeSlug: store.slug } });
      await prisma.store.delete({ where: { id: store.id } });
    }

    const usersToDelete = await prisma.user.findMany({ where: { NOT: { email: adminEmail } }, select: { id: true, email: true } });
    for (const u of usersToDelete) {
      await prisma.session.deleteMany({ where: { userId: u.id } });
      await prisma.notification.deleteMany({ where: { userId: u.id } });
      await prisma.activityLog.deleteMany({ where: { userId: u.id } });
      await prisma.customer.deleteMany({ where: { userId: u.id } });
      await prisma.developer.deleteMany({ where: { userId: u.id } });
      await prisma.user.delete({ where: { id: u.id } });
    }

    await prisma.setting.deleteMany();
    await prisma.killSwitch.deleteMany();
    await prisma.killSwitch.create({ data: {} });

    logActivity({ userId: req.user!.userId, action: 'system:cleanup', resource: 'system', resourceId: '', details: { storesDeleted: allStores.length, usersDeleted: usersToDelete.length }, req: req as any });
    res.json({ success: true, message: `Cleanup complete: ${allStores.length} stores deleted, ${usersToDelete.length} users deleted` });
  } catch (error) { next(error); }
});