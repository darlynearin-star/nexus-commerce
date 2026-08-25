import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const prismaMock = vi.hoisted(() => {
  const model = () =>
    new Proxy(
      {},
      {
        get(t: any, prop: string) {
          if (!(prop in t)) t[prop] = vi.fn().mockResolvedValue(undefined);
          return t[prop];
        },
      },
    );
  const root: any = new Proxy(
    {},
    {
      get(t: any, prop: string) {
        if (!(prop in t)) t[prop] = model();
        return t[prop];
      },
    },
  );
  return root;
});

vi.mock('@nexus/database', () => ({
  default: prismaMock,
  initDatabase: vi.fn().mockResolvedValue(undefined),
  getDbStatus: vi.fn(() => ({ usingFallback: false, activeUrl: 'test', manualSwitch: false })),
  PrismaClient: class PrismaClientMock {},
}));

import { clearUserCache } from '../middleware/auth';
import { createApp } from '../index';

const app = createApp();
const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u_ret', role: 'RETAILER', isActive: true });
  prismaMock.store.findUnique.mockResolvedValue({ id: 'store_1', slug: 'myshop', isActive: true, ownerId: 'u_ret', settings: [], theme: null });
});

function ownerToken(): string {
  return jwt.sign({ userId: 'u_ret', email: 'r@example.com', role: 'RETAILER' }, JWT_SECRET, { expiresIn: '2h' });
}

describe('H6: media list never transfers base64 blobs', () => {
  it('GET /api/media selects metadata fields and excludes data', async () => {
    prismaMock.media.findMany.mockResolvedValue([
      { id: 'm1', storeId: 'store_1', url: 'https://x/1.png', thumbnailUrl: '', alt: '1.png', type: 'image', mimeType: 'image/png', size: 10, width: 100, height: 100, folder: 'general', productId: null, createdAt: new Date() },
    ]);

    const res = await request(app)
      .get('/api/media')
      .set('x-store-slug', 'myshop')
      .set('Authorization', `Bearer ${ownerToken()}`);

    expect(res.status).toBe(200);
    const args = prismaMock.media.findMany.mock.calls[0][0];
    expect(args.select).toBeDefined();
    expect(args.select.data).toBeUndefined(); // the blob is never fetched
    expect(args.select.url).toBe(true);
    expect(args.select.mimeType).toBe(true);
    // Response rows carry metadata (and no data field by construction).
    expect(res.body.data[0].url).toBe('https://x/1.png');
    expect(res.body.data[0].data).toBeUndefined();
  });

  it('non-owner retailers cannot list another store’s media', async () => {
    prismaMock.store.findUnique.mockResolvedValue({ id: 'store_2', slug: 'other', isActive: true, ownerId: 'someone_else', settings: [], theme: null });
    const res = await request(app)
      .get('/api/media')
      .set('x-store-slug', 'other')
      .set('Authorization', `Bearer ${ownerToken()}`);
    expect(res.status).toBe(403);
    expect(prismaMock.media.findMany).not.toHaveBeenCalled();
  });
});
