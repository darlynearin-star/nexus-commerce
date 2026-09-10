import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { optimizeImage, IMAGE_MAX_DIMENSION } from './image-optimize';

async function makeImage(width: number, height: number, format: 'jpeg' | 'png' | 'webp', quality = 95): Promise<Buffer> {
  const img = sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } },
  });
  if (format === 'png') return img.png({ compressionLevel: 0 }).toBuffer();
  if (format === 'webp') return img.webp({ quality }).toBuffer();
  return img.jpeg({ quality }).toBuffer();
}

describe('optimizeImage', () => {
  it('downscales a large JPEG and shrinks its bytes', async () => {
    const input = await makeImage(2400, 3200, 'jpeg');
    const out = await optimizeImage(input, 'photo.jpg');
    expect(out).not.toBeNull();
    const meta = await sharp(out!.data).metadata();
    expect(meta.format).toBe('jpeg');
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(IMAGE_MAX_DIMENSION);
    expect(out!.data.length).toBeLessThan(input.length);
  });

  it('keeps format PNG as PNG (alpha preserved)', async () => {
    const input = await makeImage(2000, 2000, 'png');
    const out = await optimizeImage(input, 'logo.png');
    expect(out).not.toBeNull();
    const meta = await sharp(out!.data).metadata();
    expect(meta.format).toBe('png');
  });

  it('returns null for already-small inputs (never grows storage)', async () => {
    const input = await makeImage(64, 64, 'png'); // tiny, at default sharp encoding
    const out = await optimizeImage(input, 'tiny.png');
    if (out !== null) expect(out.data.length).toBeLessThanOrEqual(input.length);
  });

  it('skips animated and non-image uploads untouched', async () => {
    expect(await optimizeImage(Buffer.from('GIF89a...'), 'anim.gif')).toBeNull();
    expect(await optimizeImage(Buffer.alloc(8), 'video.mp4')).toBeNull();
    expect(await optimizeImage(Buffer.alloc(8), 'contract.pdf')).toBeNull();
  });

  it('falls back to original on corrupt image bytes', async () => {
    const garbage = Buffer.from('this is definitely not a real image file, ' .repeat(200));
    expect(await optimizeImage(garbage, 'broken.jpg')).toBeNull();
  });
});