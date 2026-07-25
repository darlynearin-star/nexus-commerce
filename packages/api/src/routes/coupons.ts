import { Router } from 'express';
import prisma from '@nexus/database';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const couponsRouter = Router();
couponsRouter.use(requireStore);

couponsRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ where: { storeId: req.storeId!, isActive: true, expiresAt: { gte: new Date() } } });
    res.json({ success: true, data: coupons });
  } catch (error) { next(error); }
});

couponsRouter.post('/', async (req: StoreRequest, res, next) => {
  try {
    const coupon = await prisma.coupon.create({ data: { ...req.body, storeId: req.storeId! } });
    res.status(201).json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

couponsRouter.put('/:id', async (req: StoreRequest, res, next) => {
  try {
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

couponsRouter.delete('/:id', async (req: StoreRequest, res, next) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) { next(error); }
});
