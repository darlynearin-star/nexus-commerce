import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { logActivity } from '../utils/activity-log';

// TODO before production launch: reduce this back to ~50-100
export const storesRouter = Router();

const CONTACT_MESSAGE = 'Service is under maintenance. Please contact Mr.Dev at +256740157510 (call/WhatsApp) or email darlenzai01@gmail.com to request a store reservation.';
const MAX_STORES = 50;

// Get current user's store
storesRouter.get('/mine', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const store = await prisma.store.findFirst({
      where: { ownerId: req.user!.userId },
      include: { settings: true, theme: true },
    });
    if (!store) return res.status(404).json({ success: false, error: 'No store found for this user' });
    // Append extra DB fields via raw SQL
    const [extraSettings] = await prisma.$queryRaw`SELECT phone, whatsapp FROM store_settings WHERE "storeId" = ${store.id}` as any;
    if (extraSettings && store.settings) Object.assign(store.settings, extraSettings);
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
    const [extraSettings] = await prisma.$queryRaw`SELECT phone, whatsapp FROM store_settings WHERE "storeId" = ${store.id}` as any;
    if (extraSettings && store.settings) Object.assign(store.settings, extraSettings);
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
    const storeCount = await prisma.store.count();
    if (storeCount >= MAX_STORES) {
      return res.status(503).json({ success: false, error: CONTACT_MESSAGE });
    }
    const { name, slug, template, colors, logoUrl } = req.body;
    const existingSlug = await prisma.store.findUnique({ where: { slug } });
    if (existingSlug) return res.status(409).json({ success: false, error: 'Store slug already taken' });

    const existingStore = await prisma.store.findFirst({ where: { ownerId: req.user!.userId } });
    if (existingStore) return res.status(409).json({ success: false, error: 'You already have a store. One email = one store.' });

    const store = await prisma.store.create({
      data: {
        name, slug, logoUrl: logoUrl || null, ownerId: req.user!.userId,
        theme: { create: { template: template || 'elegance', colors: JSON.stringify(colors || { primary: '#D4A843', secondary: '#A8822E', bg: '#0A0A0A', surface: '#141414', text: '#FAFAFA', accent: '#F0D48A' }) } },
        settings: { create: { currency: 'UGX', location: 'Kampala, Uganda' } },
      },
      include: { settings: true, theme: true },
    });

    // Sync Retailer record so landing page detects store ownership
    await prisma.retailer.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, storeName: name, storeSlug: slug },
      update: { storeName: name, storeSlug: slug },
    });

    // Set extra fields via raw SQL (columns exist in DB but not in Prisma schema)
    await prisma.$executeRaw`UPDATE store_settings SET phone = '', whatsapp = '' WHERE "storeId" = ${store.id}`;

    // Re-fetch from raw SQL to include extra fields
    const [settingsRaw] = await prisma.$queryRaw`SELECT * FROM store_settings WHERE "storeId" = ${store.id}` as any;
    if (settingsRaw && store.settings) Object.assign(store.settings, settingsRaw);

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

    const { name, isActive, logoUrl, settings, theme } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;

    const updated = await prisma.store.update({
      where: { id: req.params.id },
      data: {
        ...updateData,
        ...(settings ? { settings: { upsert: { create: settings, update: settings } } } : {}),
        ...(theme ? { theme: { upsert: { create: { template: theme.template || 'elegance', colors: JSON.stringify(theme.colors || {}) }, update: { template: theme.template, ...(theme.colors ? { colors: JSON.stringify(theme.colors) } : {}) } } } } : {}),
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
