import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate } from '../middleware/auth';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';

export const couponsRouter = Router();
couponsRouter.use(requireStore);

couponsRouter.get('/', async (req: StoreRequest, res, next) => {
  try {
    const coupons = await prisma.coupon.findMany({ where: { storeId: req.storeId!, isActive: true, expiresAt: { gte: new Date() } } });
    res.json({ success: true, data: coupons });
  } catch (error) { next(error); }
});

couponsRouter.post('/', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const { code, discountType, discountValue, minOrderAmount, minPurchase, maxUses, maxUsesPerCustomer, appliesTo, description, startsAt, expiresAt, isActive } = req.body;
    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ success: false, error: 'code, discountType and discountValue are required' });
    }
    const coupon = await prisma.coupon.create({
      data: {
        storeId: req.storeId!, code, discountType, discountValue,
        minOrderAmount: minOrderAmount ?? minPurchase ?? 0,
        maxUses: maxUses ?? 0,
        maxUsesPerCustomer: maxUsesPerCustomer ?? 0,
        appliesTo: appliesTo || [],
        description: description || '',
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: isActive ?? true,
      } as any,
    });
    res.status(201).json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

couponsRouter.put('/:id', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const existing = await prisma.coupon.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!existing) return res.status(404).json({ success: false, error: 'Coupon not found' });
    const { code, discountType, discountValue, minOrderAmount, minPurchase, maxUses, maxUsesPerCustomer, appliesTo, description, startsAt, expiresAt, isActive } = req.body;
    const data: any = {};
    if (code !== undefined) data.code = code;
    if (discountType !== undefined) data.discountType = discountType;
    if (discountValue !== undefined) data.discountValue = discountValue;
    if (minOrderAmount !== undefined) data.minOrderAmount = minOrderAmount;
    if (minPurchase !== undefined) data.minOrderAmount = minPurchase;
    if (maxUses !== undefined) data.maxUses = maxUses;
    if (maxUsesPerCustomer !== undefined) data.maxUsesPerCustomer = maxUsesPerCustomer;
    if (appliesTo !== undefined) data.appliesTo = appliesTo;
    if (description !== undefined) data.description = description;
    if (startsAt !== undefined) data.startsAt = new Date(startsAt);
    if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);
    if (isActive !== undefined) data.isActive = isActive;
    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: coupon });
  } catch (error) { next(error); }
});

couponsRouter.delete('/:id', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const existing = await prisma.coupon.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!existing) return res.status(404).json({ success: false, error: 'Coupon not found' });
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Coupon deleted' });
  } catch (error) { next(error); }
});
