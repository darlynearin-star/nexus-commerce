import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

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
const CONTENT = Buffer.from('0123456789ABCDEF');

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.media.findFirst.mockResolvedValue({
    id: 'm1', storeId: 's1', alt: 'video.mp4', type: 'file', mimeType: 'video/mp4',
    url: '/uploads/s1/m1', data: CONTENT.toString('base64'),
  });
  prismaMock.adVideo.findUnique.mockResolvedValue({ data: CONTENT.toString('base64'), format: '9:16' });
});

describe('M-video: HTTP Range support on /uploads and /api/ads/:id/download', () => {
  it('no Range → full 200 with Accept-Ranges advertised', async () => {
    const res = await request(app).get('/uploads/s1/m1');
    expect(res.status).toBe(200);
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-length']).toBe('16');
    expect(res.body.toString()).toBe(CONTENT.toString());
  });

  it('bytes=4-11 → 206 partial content with Content-Range', async () => {
    const res = await request(app).get('/uploads/s1/m1').set('Range', 'bytes=4-11');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 4-11/16');
    expect(res.headers['content-length']).toBe('8');
    expect(res.body.toString()).toBe('456789AB');
  });

  it('open-ended bytes=10- → serves to end', async () => {
    const res = await request(app).get('/uploads/s1/m1').set('Range', 'bytes=10-');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 10-15/16');
    expect(res.body.toString()).toBe('ABCDEF');
  });

  it('suffix bytes=-4 → last 4 bytes', async () => {
    const res = await request(app).get('/uploads/s1/m1').set('Range', 'bytes=-4');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 12-15/16');
    expect(res.body.toString()).toBe('CDEF');
  });

  it('start beyond EOF and empty ranges → 416 with Content-Range: bytes */N', async () => {
    const res1 = await request(app).get('/uploads/s1/m1').set('Range', 'bytes=99-200');
    expect(res1.status).toBe(416);
    expect(res1.headers['content-range']).toBe('bytes */16');
    const res2 = await request(app).get('/uploads/s1/m1').set('Range', 'bytes=-');
    expect(res2.status).toBe(416);
  });

  it('ads download route serves 206 partial content equally', async () => {
    const res = await request(app).get('/api/ads/ad_1/download').set('Range', 'bytes=0-3');
    expect(res.status).toBe(206);
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(res.body.toString()).toBe('0123');
  });

  it('ads download without Range returns full content with caching headers', async () => {
    const res = await request(app).get('/api/ads/ad_1/download');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toContain('immutable');
  });
});
