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
    const { url, thumbnailUrl, alt, type, mimeType, size, width, height, folder, productId } = req.body;
    const media = await prisma.media.create({ data: { url, thumbnailUrl: thumbnailUrl || '', alt: alt || '', type: type || 'image', mimeType: mimeType || 'image/jpeg', size: size || 0, width: width || 0, height: height || 0, folder: folder || 'general', productId: productId || null, storeId: req.storeId! } });
    res.status(201).json({ success: true, data: media });
  } catch (error) { next(error); }
});

mediaRouter.delete('/:id', authenticate, requirePermission(Permission.MANAGE_MEDIA), async (req: StoreRequest, res, next) => {
  try {
    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Media deleted' });
  } catch (error) { next(error); }
});
