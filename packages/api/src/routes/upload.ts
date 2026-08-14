import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';

// Uploads are stored in the database (Media.data as base64) and served through
// /uploads/:storeId/:mediaId. This survives ephemeral host filesystems (Render
// recreates the disk on every deploy, which used to wipe uploaded images).
const API_BASE = process.env.RENDER_EXTERNAL_URL || 'https://nexus-api-69q5.onrender.com';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|mp4|pdf|doc|docx/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

export const uploadRouter = Router();
uploadRouter.use(requireStore);

uploadRouter.post(['/', ''], authenticate, requireStoreOwner, requirePermission(Permission.MANAGE_MEDIA), upload.single('file'), async (req: StoreRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { originalname, buffer, size, mimetype } = req.file;
    const media = await prisma.media.create({
      data: {
        storeId: req.storeId!,
        url: '',
        thumbnailUrl: '',
        alt: originalname,
        type: mimetype.startsWith('image/') ? 'image' : 'document',
        mimeType: mimetype,
        size,
        data: buffer.toString('base64'),
        folder: req.body.folder || 'general',
        productId: req.body.productId || null,
      },
    });
    const url = `${API_BASE}/uploads/${req.storeId}/${media.id}`;
    await prisma.media.update({ where: { id: media.id }, data: { url, thumbnailUrl: url } });
    res.status(201).json({ success: true, data: { ...media, url, thumbnailUrl: url } });
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