import { Router, Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '@nexus/database';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { StoreRequest, requireStore } from '../middleware/resolve-store';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: (req: any, _file, cb) => {
    const storeId = req.storeId || 'common';
    const dir = path.join(UPLOAD_DIR, storeId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|mp4|pdf|doc|docx/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    cb(null, ok);
  },
});

export const uploadRouter = Router();
uploadRouter.use(requireStore);

uploadRouter.post('/', authenticate, requirePermission(Permission.MANAGE_MEDIA), upload.single('file'), async (req: StoreRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
    const { originalname, filename, size, mimetype } = req.file;
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/uploads/${req.storeId}/${filename}`;
    const media = await prisma.media.create({
      data: {
        storeId: req.storeId!,
        url,
        thumbnailUrl: url,
        alt: originalname,
        type: mimetype.startsWith('image/') ? 'image' : 'document',
        mimeType: mimetype,
        size,
        folder: req.body.folder || 'general',
        productId: req.body.productId || null,
      },
    });
    res.status(201).json({ success: true, data: media });
  } catch (error) { next(error); }
});

uploadRouter.post('/url', authenticate, requirePermission(Permission.MANAGE_MEDIA), async (req: StoreRequest, res, next) => {
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
