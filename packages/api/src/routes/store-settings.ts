import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';

export const storeSettingsRouter = Router();
storeSettingsRouter.use(authenticate);
storeSettingsRouter.use(requireStore);
storeSettingsRouter.use(requireStoreOwner);

storeSettingsRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    let settings = await prisma.storeSettings.findUnique({ where: { storeId: req.storeId! } });
    if (!settings) {
      settings = await prisma.storeSettings.create({ data: { storeId: req.storeId! } });
    }
    const [extra] = await prisma.$queryRaw`SELECT phone, whatsapp FROM store_settings WHERE "storeId" = ${req.storeId!}` as any;
    if (extra) {
      settings = { ...settings, phone: extra.phone || '', whatsapp: extra.whatsapp || '' } as any;
    }
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
});

storeSettingsRouter.put('/', async (req: StoreRequest, res, next) => {
  try {
    const allowed = ['currency', 'location'];
    const update: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const settings = await prisma.storeSettings.upsert({
      where: { storeId: req.storeId! },
      create: { storeId: req.storeId!, ...update },
      update,
    });
    if (req.body.phone !== undefined || req.body.whatsapp !== undefined) {
      const phone = req.body.phone !== undefined ? req.body.phone : '';
      const whatsapp = req.body.whatsapp !== undefined ? req.body.whatsapp : '';
      await prisma.$executeRaw`UPDATE store_settings SET phone = ${phone}, whatsapp = ${whatsapp} WHERE "storeId" = ${req.storeId!}`;
    }
    const [extra] = await prisma.$queryRaw`SELECT phone, whatsapp FROM store_settings WHERE "storeId" = ${req.storeId!}` as any;
    res.json({ success: true, data: { ...settings, phone: extra?.phone || '', whatsapp: extra?.whatsapp || '' } });
  } catch (error) { next(error); }
});
