import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import prisma from '@nexus/database';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '@nexus/shared';
import { StoreRequest, requireStore, requireStoreOwner } from '../middleware/resolve-store';
import { storage, mimeFromFilename } from '../utils/storage';
import { optimizeImage } from '../utils/image-optimize';

export { mimeFromFilename };

// Per-store upload quotas protect the shared free-tier bucket from a single
// store exhausting storage. Limits are tunable via env (defaults below).
export interface UploadLimits {
  daily: number;
  total: number;
}

export function getUploadLimits(env: NodeJS.ProcessEnv = process.env): UploadLimits {
  return {
    daily: Number(env.UPLOAD_DAILY_LIMIT) || 100,
    total: Number(env.UPLOAD_TOTAL_LIMIT) || 500,
  };
}

// Pure decision so it is unit-testable without a database.
export function uploadBlockReason(dailyCount: number, totalCount: number, limits: UploadLimits = getUploadLimits()): string | null {
  if (dailyCount >= limits.daily) return `Daily upload limit reached (${limits.daily} images per day per store)`;
  if (totalCount >= limits.total) return `Storage limit reached (${limits.total} images max per store)`;
  return null;
}

async function overUploadQuota(storeId: string): Promise<string | null> {
  const now = new Date();
  const startOfUtcDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [daily, total] = await Promise.all([
    prisma.media.count({ where: { storeId, createdAt: { gte: startOfUtcDay } } }),
    prisma.media.count({ where: { storeId } }),
  ]);
  return uploadBlockReason(daily, total);
}

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
    const reason = await overUploadQuota(req.storeId!);
    if (reason) return res.status(429).json({ success: false, error: reason });
    const { originalname, buffer } = req.file;
    // Shrink raster images before they reach storage — bounded size + quality,
    // honors EXIF rotation, keeps the format so the stored type stays truthful.
    const optimized = await optimizeImage(buffer, originalname);
    const finalBuffer = optimized ? optimized.data : buffer;
    const { media } = await storage.store({
      storeId: req.storeId!,
      buffer: finalBuffer,
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
    const reason = await overUploadQuota(req.storeId!);
    if (reason) return res.status(429).json({ success: false, error: reason });
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