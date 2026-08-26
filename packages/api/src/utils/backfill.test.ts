import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  findManyMedia: vi.fn(),
  findManyAds: vi.fn(),
  countMedia: vi.fn(),
  countAdVids: vi.fn(),
  updateMedia: vi.fn(),
  updateAd: vi.fn(),
  putS3Object: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@nexus/database', () => ({
  default: {
    media: { findMany: h.findManyMedia, update: h.updateMedia, count: h.countMedia },
    adVideo: { findMany: h.findManyAds, update: h.updateAd, count: h.countAdVids },
  },
}));

vi.mock('./storage', () => ({
  putS3Object: h.putS3Object,
  isS3Configured: (cfg: any) => cfg.provider === 's3' && !!cfg.endpoint && !!cfg.bucket && !!cfg.accessKeyId,
}));

import { backfillStorage, adObjectKey } from './backfill';

const s3Cfg = {
  provider: 's3' as const,
  endpoint: 'https://acc.r2.cloudflarestorage.com',
  region: 'auto',
  accessKeyId: 'k',
  secretAccessKey: 's',
  bucket: 'b',
  publicBaseUrl: 'https://cdn.example.com',
  forcePathStyle: true,
};

describe('R2 blob backfill (M-mirror)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.putS3Object.mockResolvedValue(undefined);
    h.countMedia.mockResolvedValue(0);
    h.countAdVids.mockResolvedValue(0);
  });

  it('dry-run reports counts + bytes and writes nothing', async () => {
    h.findManyMedia.mockResolvedValue([{ id: 'm1', storeId: 's1', alt: 'a.png', mimeType: 'image/png', data: Buffer.alloc(400).toString('base64') }]);
    h.findManyAds.mockResolvedValue([{ id: 'ad1', format: '9:16', data: Buffer.alloc(800).toString('base64') }]);

    const r = await backfillStorage(s3Cfg, true);

    expect(r.mediaRemaining).toBe(1);
    expect(r.adsRemaining).toBe(1);
    const b64len = Buffer.alloc(400).toString('base64').length;
    expect(r.mediaBytes).toBe(Math.ceil(b64len * 0.75));
    expect(r.adsBytes).toBe(Math.ceil(Buffer.alloc(800).toString('base64').length * 0.75));
    expect(r.moved).toEqual({ media: 0, ads: 0 });
    expect(h.putS3Object).not.toHaveBeenCalled();
    expect(h.updateMedia).not.toHaveBeenCalled();
    expect(h.updateAd).not.toHaveBeenCalled();
  });

  it('migrates media blobs: uploads under store key, points url at CDN, clears data', async () => {
    h.findManyMedia.mockResolvedValue([{ id: 'm1', storeId: 's1', alt: 'photo.jpg', mimeType: 'image/jpeg', data: Buffer.from('x').toString('base64') }]);
    h.findManyAds.mockResolvedValue([]);

    await backfillStorage(s3Cfg, false);

    expect(h.putS3Object).toHaveBeenCalledWith(s3Cfg, 's1/m1.jpg', Buffer.from('x'), 'image/jpeg');
    expect(h.updateMedia).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { url: 'https://cdn.example.com/s1/m1.jpg', thumbnailUrl: 'https://cdn.example.com/s1/m1.jpg', data: null },
    });
  });

  it('migrates ad blobs under the ad-studio namespace with format-safe keys', async () => {
    h.findManyMedia.mockResolvedValue([]);
    h.findManyAds.mockResolvedValue([{ id: 'ad1', format: '9:16', data: Buffer.from('y').toString('base64') }]);

    await backfillStorage(s3Cfg, false);

    expect(adObjectKey('ad1', '9:16')).toBe('ad-studio/ad1-9x16.mp4');
    expect(h.putS3Object).toHaveBeenCalledWith(s3Cfg, 'ad-studio/ad1-9x16.mp4', Buffer.from('y'), 'video/mp4');
    expect(h.updateAd).toHaveBeenCalledWith({
      where: { id: 'ad1' },
      data: { videoUrl: 'https://cdn.example.com/ad-studio/ad1-9x16.mp4', data: null },
    });
  });

  it('one failing upload never aborts the batch and keeps its blob intact', async () => {
    h.findManyMedia.mockResolvedValue([
      { id: 'bad', storeId: 's1', alt: 'a.png', mimeType: 'image/png', data: Buffer.from('a').toString('base64') },
      { id: 'good', storeId: 's1', alt: 'b.png', mimeType: 'image/png', data: Buffer.from('b').toString('base64') },
    ]);
    h.findManyAds.mockResolvedValue([]);
    h.putS3Object.mockImplementation((_cfg: any, key: string) => (key.includes('bad') ? Promise.reject(new Error('r2 boom')) : Promise.resolve()));

    const r = await backfillStorage(s3Cfg, false);

    expect(r.moved.media).toBe(1);
    expect(r.failed.media).toBe(1);
    expect(r.errors.some((e) => e.includes('media bad'))).toBe(true);
    expect(h.updateMedia).toHaveBeenCalledTimes(1); // only the good one was cleared
  });

  it('returns early without uploading when R2 is not configured', async () => {
    h.findManyMedia.mockResolvedValue([{ id: 'm1', storeId: 's1', alt: 'a.png', mimeType: 'image/png', data: 'AAAA' }]);
    h.findManyAds.mockResolvedValue([]);

    const r = await backfillStorage({ ...s3Cfg, provider: 'db' } as any, false);

    expect(r.moved).toEqual({ media: 0, ads: 0 });
    expect(h.putS3Object).not.toHaveBeenCalled();
  });
});

