import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const couponsRouter = Router();
couponsRouter.use(requireStore);

couponsRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ where: { storeId: req.storeId!, isActive: true, expiresAt: { gte: new Date() } } });
    res.json({ success: true, data: coupons });
  } catch (error) { next(error); }
});

couponsRouter.post('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { code, discountType, discountValue, minPurchase, maxUses, expiresAt } = req.body;
    const coupon = await prisma.coupon.create({
      data: { storeId: req.storeId!, code, discountType, discountValue, minPurchase, maxUses, expiresAt: expiresAt ? new Date(expiresAt) : undefined } as any,
    });
    res.status(201).json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

couponsRouter.put('/:id', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const { code, discountType, discountValue, minPurchase, maxUses, isActive, expiresAt } = req.body;
    const data: any = {};
    if (code !== undefined) data.code = code;
    if (discountType !== undefined) data.discountType = discountType;
    if (discountValue !== undefined) data.discountValue = discountValue;
    if (minPurchase !== undefined) data.minPurchase = minPurchase;
    if (maxUses !== undefined) data.maxUses = maxUses;
    if (isActive !== undefined) data.isActive = isActive;
    if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

couponsRouter.delete('/:id', authenticate, async (req: StoreRequest, res, next) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) { next(error); }
});
