import { Router } from 'express';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';
import { storage } from '../utils/storage';

export const mediaRouter = Router();
mediaRouter.use(requireStore);

// H6: never SELECT the base64 `data` column in list queries — with blobs
// stored inline, a 200-asset store previously shipped ~1GB from Postgres to
// the API just to strip the field from the response afterwards.
const MEDIA_LIST_SELECT = {
  id: true,
  storeId: true,
  url: true,
  thumbnailUrl: true,
  alt: true,
  type: true,
  mimeType: true,
  size: true,
  width: true,
  height: true,
  folder: true,
  productId: true,
  createdAt: true,
};

mediaRouter.get('/', authenticate, requireStoreOwner, async (req: StoreRequest, res, next) => {
  try {
    const media = await prisma.media.findMany({
      where: { storeId: req.storeId! },
      orderBy: { createdAt: 'desc' },
      select: MEDIA_LIST_SELECT,
    });
    res.json({ success: true, data: media });
  } catch (error) { next(error); }
});

mediaRouter.post('/', authenticate, requireStoreOwner, requirePermission(Permission.MANAGE_MEDIA), async (req: StoreRequest, res, next) => {
  try {
    const { url, thumbnailUrl, alt, type, mimeType, size, width, height, folder, productId } = req.body;
    const media = await prisma.media.create({ data: { url, thumbnailUrl: thumbnailUrl || '', alt: alt || '', type: type || 'image', mimeType: mimeType || 'image/jpeg', size: size || 0, width: width || 0, height: height || 0, folder: folder || 'general', productId: productId || null, storeId: req.storeId! } });
    res.status(201).json({ success: true, data: media });
  } catch (error) { next(error); }
});

mediaRouter.delete('/:id', authenticate, requireStoreOwner, requirePermission(Permission.MANAGE_MEDIA), async (req: StoreRequest, res, next) => {
  try {
    const existing = await prisma.media.findFirst({ where: { id: req.params.id, storeId: req.storeId! } });
    if (!existing) return res.status(404).json({ success: false, error: 'Media not found' });
    await storage.remove(req.storeId!, req.params.id);
    await prisma.media.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Media deleted' });
  } catch (error) { next(error); }
});
