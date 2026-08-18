import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '@nexus/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';
import { storage, mimeFromFilename } from '../utils/storage';

export { mimeFromFilename };

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    // Refuse SVG uploads: SVG is HTML+script capable and would be served from the
    // API origin, creating a stored-XSS / phishing vector.
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = /jpeg|jpg|png|gif|webp|mp4|pdf|doc|docx/;
    cb(null, allowed.test(ext));
  },
});

export const uploadRouter = Router();
uploadRouter.use(requireStore);

uploadRouter.post(['/', ''], authenticate, requireStoreOwner, requirePermission(Permission.MANAGE_MEDIA), upload.single('file'), async (req: StoreRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { originalname, buffer } = req.file;
    const { media } = await storage.store({
      storeId: req.storeId!,
      buffer,
      filename: originalname,
      folder: req.body.folder,
      productId: req.body.productId,
    });
    res.status(201).json({ success: true, data: media });
  } catch (error) { next(error); }
});

uploadRouter.post(['/url', 'url'], authenticate, requireStoreOwner, requirePermission(Permission.MANAGE_MEDIA), async (req: StoreRequest, res, next) => {
  try {
    const { url, alt, folder, productId } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL is required' });
    const media = await prisma.media.create({
      data: {
        storeId: req.storeId!,
        url, thumbnailUrl: url, alt: alt || '',
        type: 'image', mimeType: 'image/jpeg',
        folder: folder || 'general',
        productId: productId || null,
      },
    });
    res.status(201).json({ success: true, data: media });
  } catch (error) { next(error); }
});