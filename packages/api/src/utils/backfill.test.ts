import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  findManyMedia: vi.fn(),
  findManyAds: vi.fn(),
  countMedia: vi.fn(),
  countAdVids: vi.fn(),
  updateMedia: vi.fn(),
  updateAd: vi.fn(),
  putS3Object: vi.fn().mockResolvedValue(undefined),
  findManyProducts: vi.fn(),
  updateProduct: vi.fn(),
  findManyCategories: vi.fn(),
  updateCategory: vi.fn(),
  findManyBrands: vi.fn(),
  updateBrand: vi.fn(),
  queryRawUnsafe: vi.fn(),
  findManyVariants: vi.fn(),
  updateVariant: vi.fn(),
  findManyStores: vi.fn(),
  updateStore: vi.fn(),
  findManyDownloads: vi.fn(),
  updateDownload: vi.fn(),
}));

vi.mock('@nexus/database', () => ({
  default: {
    media: { findMany: h.findManyMedia, update: h.updateMedia, count: h.countMedia },
    adVideo: { findMany: h.findManyAds, update: h.updateAd, count: h.countAdVids },
    product: { findMany: h.findManyProducts, update: h.updateProduct },
    category: { findMany: h.findManyCategories, update: h.updateCategory },
    brand: { findMany: h.findManyBrands, update: h.updateBrand },
    productVariant: { findMany: h.findManyVariants, update: h.updateVariant },
    store: { findMany: h.findManyStores, update: h.updateStore },
    productDownload: { findMany: h.findManyDownloads, update: h.updateDownload },
    $queryRawUnsafe: h.queryRawUnsafe,
  },
}));

vi.mock('./storage', () => ({
  putS3Object: h.putS3Object,
  getApiBase: () => 'https://nexus-api-69q5.onrender.com',
  isS3Configured: (cfg: any) => cfg.provider === 's3' && !!cfg.endpoint && !!cfg.bucket && !!cfg.accessKeyId,
}));

import { backfillStorage, adObjectKey, buildUploadUrlMap, rewriteUploadReferences } from './backfill';

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
    h.queryRawUnsafe.mockResolvedValue([{ n: 0, bytes: 0 }]);
  });

it('dry-run reports counts + bytes and writes nothing', async () => {
    const b64len = Buffer.alloc(400).toString('base64').length;
    const adlen = Buffer.alloc(800).toString('base64').length;
    h.queryRawUnsafe.mockImplementation((q: string) =>
      Promise.resolve([{ n: 1, bytes: q.includes('FROM media') ? b64len : adlen }]),
    );

    const r = await backfillStorage(s3Cfg, true);

    expect(r.mediaRemaining).toBe(1);
    expect(r.adsRemaining).toBe(1);
    expect(r.mediaBytes).toBe(Math.ceil(b64len * 0.75));
    expect(r.adsBytes).toBe(Math.ceil(adlen * 0.75));
    expect(r.moved).toEqual({ media: 0, ads: 0 });
    expect(h.putS3Object).not.toHaveBeenCalled();
    expect(h.updateMedia).not.toHaveBeenCalled();
    expect(h.updateAd).not.toHaveBeenCalled();
  });

it('migrates media blobs: uploads under store key, points url at CDN, clears data', async () => {
    h.findManyMedia
      .mockResolvedValueOnce([{ id: 'm1', storeId: 's1', alt: 'photo.jpg', mimeType: 'image/jpeg', data: Buffer.from('x').toString('base64') }])
      .mockResolvedValue([]);
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
    h.findManyAds
      .mockResolvedValueOnce([{ id: 'ad1', format: '9:16', data: Buffer.from('y').toString('base64') }])
      .mockResolvedValue([]);

    await backfillStorage(s3Cfg, false);

    expect(adObjectKey('ad1', '9:16')).toBe('ad-studio/ad1-9x16.mp4');
    expect(h.putS3Object).toHaveBeenCalledWith(s3Cfg, 'ad-studio/ad1-9x16.mp4', Buffer.from('y'), 'video/mp4');
    expect(h.updateAd).toHaveBeenCalledWith({
      where: { id: 'ad1' },
      data: { videoUrl: 'https://cdn.example.com/ad-studio/ad1-9x16.mp4', data: null },
    });
  });

it('one failing upload never aborts the batch and keeps its blob intact', async () => {
    h.findManyMedia
      .mockResolvedValueOnce([
        { id: 'bad', storeId: 's1', alt: 'a.png', mimeType: 'image/png', data: Buffer.from('a').toString('base64') },
        { id: 'good', storeId: 's1', alt: 'b.png', mimeType: 'image/png', data: Buffer.from('b').toString('base64') },
      ])
      .mockResolvedValue([]);
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

describe('upload URL mapping', () => {
  it('maps old /uploads URLs to the CDN origin with the same key scheme', () => {
    const map = buildUploadUrlMap([{ id: 'm1', storeId: 's1', alt: 'photo.jpg' }], s3Cfg);
    expect(map).toEqual({
      'https://nexus-api-69q5.onrender.com/uploads/s1/m1': 'https://cdn.example.com/s1/m1.jpg',
    });
  });
});

describe('reference rewrite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.findManyProducts.mockResolvedValue([]);
    h.findManyCategories.mockResolvedValue([]);
    h.findManyBrands.mockResolvedValue([]);
    h.findManyVariants.mockResolvedValue([]);
    h.findManyStores.mockResolvedValue([]);
    h.findManyDownloads.mockResolvedValue([]);
  });

  const OLD = 'https://nexus-api-69q5.onrender.com/uploads/s1/m1';

  it('dry-run reports planned updates without writing', async () => {
    h.findManyMedia.mockResolvedValue([{ id: 'm1', storeId: 's1', alt: 'photo.jpg' }]);
    h.findManyProducts.mockResolvedValue([{ id: 'p1', images: [OLD] }]);
    h.findManyStores.mockResolvedValue([{ id: 'st1', logoUrl: OLD }]);

    const r = await rewriteUploadReferences(s3Cfg, { dryRun: true });

    expect(r.scanned.products).toBe(1);
    expect(r.updated.products).toBe(1);
    expect(r.scanned.stores).toBe(1);
    expect(r.updated.stores).toBe(1);
    expect(r.remaining).toBe(0);
    expect(h.updateProduct).not.toHaveBeenCalled();
    expect(h.updateStore).not.toHaveBeenCalled();
  });

  it('commits rewrites across product images and scalar columns', async () => {
    h.findManyMedia.mockResolvedValue([{ id: 'm1', storeId: 's1', alt: 'photo.jpg' }]);
    h.findManyProducts.mockResolvedValue([{ id: 'p1', images: [OLD, 'https://cdn.example.com/s1/m1.jpg'] }]);
    h.findManyCategories.mockResolvedValue([{ id: 'c1', image: OLD }]);
    h.findManyBrands.mockResolvedValue([{ id: 'b1', logo: '' }]);
    h.findManyVariants.mockResolvedValue([{ id: 'v1', image: 'https://external.example/other.png' }]);
    h.findManyStores.mockResolvedValue([{ id: 'st1', logoUrl: OLD }]);
    h.findManyDownloads.mockResolvedValue([{ id: 'd1', fileUrl: OLD }]);

    const r = await rewriteUploadReferences(s3Cfg, { dryRun: false });

    expect(r.updated).toEqual({ products: 1, categories: 1, brands: 0, variants: 0, stores: 1, downloads: 1 });
    expect(r.remaining).toBe(0);
    const NEW = 'https://cdn.example.com/s1/m1.jpg';
    expect(h.updateProduct).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { images: [NEW, NEW] } });
    expect(h.updateCategory).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { image: NEW } });
    expect(h.updateBrand).not.toHaveBeenCalled();
    expect(h.updateVariant).not.toHaveBeenCalled();
    expect(h.updateStore).toHaveBeenCalledWith({ where: { id: 'st1' }, data: { logoUrl: NEW } });
    expect(h.updateDownload).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { fileUrl: NEW } });
  });

  it('flags orphaned references that point at uploads with no media row', async () => {
    h.findManyMedia.mockResolvedValue([]);
    h.findManyProducts.mockResolvedValue([{ id: 'p1', images: ['https://nexus-api-69q5.onrender.com/uploads/s1/ghost'] }]);
    h.findManyCategories.mockResolvedValue([]);
    h.findManyBrands.mockResolvedValue([]);
    h.findManyVariants.mockResolvedValue([]);
    h.findManyStores.mockResolvedValue([{ id: 'st1', logoUrl: 'https://nexus-api-69q5.onrender.com/uploads/s1/ghost2' }]);
    h.findManyDownloads.mockResolvedValue([]);

    const r = await rewriteUploadReferences(s3Cfg, { dryRun: true });

    expect(r.updated).toEqual({ products: 0, categories: 0, brands: 0, variants: 0, stores: 0, downloads: 0 });
    expect(r.remaining).toBe(2);
  });
});

