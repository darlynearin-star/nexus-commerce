import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const storeSettingsRouter = Router();
storeSettingsRouter.use(authenticate);
storeSettingsRouter.use(requireStore);

storeSettingsRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    let settings = await prisma.storeSettings.findUnique({ where: { storeId: req.storeId! } });
    if (!settings) {
      settings = await prisma.storeSettings.create({ data: { storeId: req.storeId! } });
    }
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
});

storeSettingsRouter.put('/', async (req: StoreRequest, res, next) => {
  try {
    const allowed = ['currency', 'taxRate', 'shippingThreshold', 'shippingRate', 'location'];
    const update: any = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const settings = await prisma.storeSettings.upsert({
      where: { storeId: req.storeId! },
      create: { storeId: req.storeId!, ...update },
      update,
    });
    res.json({ success: true, data: settings });
  } catch (error) { next(error); }
});
