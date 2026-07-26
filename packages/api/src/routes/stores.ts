import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

export const storesRouter = Router();

// Get current user's store
storesRouter.get('/mine', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const store = await prisma.store.findFirst({
      where: { ownerId: req.user!.userId },
      include: { settings: true, theme: true },
    });
    if (!store) return res.status(404).json({ success: false, error: 'No store found for this user' });
    res.json({ success: true, data: store });
  } catch (error) { next(error); }
});

// List all stores (dev)
storesRouter.get('/', authenticate, requirePermission(Permission.MANAGE_SYSTEM), async (_req, res, next) => {
  try {
    const stores = await prisma.store.findMany({
      include: { settings: true, theme: true, owner: { select: { id: true, email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: stores });
  } catch (error) { next(error); }
});

// Get public store info by slug
storesRouter.get('/public/:slug', async (req, res, next) => {
  try {
    const store = await prisma.store.findUnique({
      where: { slug: req.params.slug },
      include: { settings: true, theme: true },
    });
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
    if (!store.isActive) return res.status(503).json({ success: false, error: 'Store is currently disabled' });
    res.json({ success: true, data: store });
  } catch (error) { next(error); }
});

// Check slug availability
storesRouter.get('/check-slug/:slug', async (req, res, next) => {
  try {
    const existing = await prisma.store.findUnique({ where: { slug: req.params.slug } });
    res.json({ success: true, data: { available: !existing } });
  } catch (error) { next(error); }
});

// Create a store (authenticated users)
storesRouter.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { name, slug, template, colors } = req.body;
    const existing = await prisma.store.findUnique({ where: { slug } });
    if (existing) return res.status(409).json({ success: false, error: 'Store slug already taken' });

    const store = await prisma.store.create({
      data: {
        name, slug, ownerId: req.user!.userId,
        theme: { create: { template: template || 'elegance', colors: JSON.stringify(colors || { primary: '#D4A843', secondary: '#A8822E', bg: '#0A0A0A', surface: '#141414', text: '#FAFAFA', accent: '#F0D48A' }) } },
        settings: { create: { currency: 'UGX', taxRate: 18, shippingThreshold: 150000, location: 'Kampala, Uganda', shippingRate: 15000 } },
      },
      include: { settings: true, theme: true },
    });

    logActivity({ userId: req.user!.userId, action: 'store:created', resource: 'store', resourceId: store.id, req: req as any });
    res.status(201).json({ success: true, data: store });
  } catch (error) { next(error); }
});

// Update store
storesRouter.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const store = await prisma.store.findUnique({ where: { id: req.params.id } });
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
    if (store.ownerId !== req.user!.userId && req.user!.role !== 'SUPER_DEVELOPER') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const { name, isActive, settings, theme } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.store.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(settings ? { settings: { upsert: { create: settings, update: settings } } } : {}),
        ...(theme ? { theme: { upsert: { create: { template: theme.template, colors: JSON.stringify(theme.colors) }, update: { template: theme.template, colors: JSON.stringify(theme.colors) } } } } : {}),
      },
      include: { settings: true, theme: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});

// Toggle store active state
storesRouter.post('/:id/toggle', authenticate, requirePermission(Permission.MANAGE_SYSTEM), async (req: AuthRequest, res, next) => {
  try {
    const store = await prisma.store.findUnique({ where: { id: req.params.id } });
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });

    const updated = await prisma.store.update({
      where: { id: req.params.id },
      data: { isActive: !store.isActive },
    });

    logActivity({ userId: req.user!.userId, action: updated.isActive ? 'store:activated' : 'store:deactivated', resource: 'store', resourceId: store.id, req: req as any });
    res.json({ success: true, data: updated });
  } catch (error) { next(error); }
});
