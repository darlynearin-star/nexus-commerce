import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

export const mediaRouter = Router();
mediaRouter.use(requireStore);

mediaRouter.get('/', authenticate, async (req: StoreRequest, res, next) => {
  try {
    const media = await prisma.media.findMany({ where: { storeId: req.storeId! }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: media });
  } catch (error) { next(error); }
});

mediaRouter.post('/', authenticate, requirePermission(Permission.MANAGE_MEDIA), async (req: StoreRequest, res, next) => {
  try {
    const media = await prisma.media.create({ data: { ...req.body, storeId: req.storeId! } });
    res.status(201).json({ success: true, data: media });
  } catch (error) { next(error); }
});

mediaRouter.delete('/:id', authenticate, requirePermission(Permission.MANAGE_MEDIA), async (req: StoreRequest, res, next) => {
  try {
    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Media deleted' });
  } catch (error) { next(error); }
});
