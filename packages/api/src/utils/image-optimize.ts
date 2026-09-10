import path from 'path';
import sharp from 'sharp';

// Longest edge after optimization. Product photos at 1600px render crisply on
// any screen while costing a fraction of the original phone-photo bytes.
export const IMAGE_MAX_DIMENSION = 1600;

// Formats safe to re-encode. GIF is excluded (animation), non-images excluded.
const OPTIMIZABLE = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export interface OptimizeResult {
  data: Buffer;
  width: number;
  height: number;
}

// Re-encodes a raster image at a bounded size and quality. Returns null when
// the input is not a raster image, unreadable, or already smaller than what we
// would produce — in which case the caller keeps the original buffer untouched.
export async function optimizeImage(buffer: Buffer, filename: string): Promise<OptimizeResult | null> {
  const ext = path.extname(filename).toLowerCase();
  if (!OPTIMIZABLE.has(ext)) return null;
  try {
    const meta = await sharp(buffer, { failOn: 'none' }).metadata();
    if (!meta.format || meta.format === 'svg') return null;

    // failOn: 'none' — tolerate slightly corrupt headers; the later size gate
    // also falls back to the original if anything looks off.
    let pipeline = sharp(buffer, { failOn: 'none', animated: false })
      .rotate() // honor EXIF orientation from phone photos
      .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true });

    if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9 });
    else if (ext === '.webp') pipeline = pipeline.webp({ quality: 80, effort: 6 });
    else pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });

    const out = await pipeline.toBuffer();
    const outMeta = await sharp(out, { failOn: 'none' }).metadata();

    // Never store more bytes than the caller handed us.
    if (out.length >= buffer.length) return null;
    return { data: out, width: outMeta.width || 0, height: outMeta.height || 0 };
  } catch {
    return null;
  }
}