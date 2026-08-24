import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { AddressInfo } from 'node:net';

// Proxy-based prisma mock (same pattern as the other integration tests):
// every model method is a vi.fn() resolving undefined unless overridden.
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
import { storeAdResult } from '../utils/ad-render';
import { StorageConfig } from '../utils/storage';

const app = createApp();

function listen(): Promise<{ server: http.Server; port: number; requests: http.IncomingMessage[]; bodies: Buffer[] }> {
  return new Promise((resolve) => {
    const requests: http.IncomingMessage[] = [];
    const bodies: Buffer[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req);
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        bodies.push(Buffer.concat(chunks));
        res.writeHead(200);
        res.end('ok');
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, port, requests, bodies });
    });
  });
}

function s3Settings(port: number) {
  const values: Record<string, string> = {
    STORAGE_PROVIDER: 's3',
    STORAGE_ENDPOINT: `http://127.0.0.1:${port}`,
    STORAGE_BUCKET: 'ads-bucket',
    STORAGE_REGION: 'auto',
    STORAGE_ACCESS_KEY_ID: 'TESTAKID',
    STORAGE_SECRET_ACCESS_KEY: 'TESTSECRET',
    STORAGE_PUBLIC_BASE_URL: `http://127.0.0.1:${port}/public`,
    STORAGE_FORCE_PATH_STYLE: 'true',
  };
  return Object.entries(values).map(([key, value]) => ({ key, value }));
}

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
});

describe('C1: storeAdResult decouples ad videos from store media', () => {
  it('DB-fallback path: stores base64 on AdVideo and returns the download URL — never touches Media', async () => {
    prismaMock.setting.findMany.mockResolvedValue([]); // no STORAGE_* config → DB fallback

    const bytes = Buffer.from('fake-mp4-bytes');
    const result = await storeAdResult('ad_123', '9:16', bytes);

    expect(result.status).toBe('DONE');
    expect(result.data).toBe(bytes.toString('base64'));
    expect(result.videoUrl).toContain('/api/ads/ad_123/download');
    // The whole point of C1: no Media row may be created for ads.
    expect(prismaMock.media.create).not.toHaveBeenCalled();
  });

  it('R2/S3 path: PUTs to object storage and returns the public URL — no Media row, no inline blob', async () => {
    const { server, port, requests, bodies } = await listen();
    try {
      prismaMock.setting.findMany.mockResolvedValue(s3Settings(port));

      const bytes = Buffer.from('fake-mp4-bytes');
      const result = await storeAdResult('ad_456', '16:9', bytes);

      expect(result.status).toBe('DONE');
      expect(result.data).toBeUndefined();
      expect(result.videoUrl).toBe(`http://127.0.0.1:${port}/public/ad-studio/ad_456-16x9.mp4`);
      expect(prismaMock.media.create).not.toHaveBeenCalled();

      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('PUT');
      expect(requests[0].url).toContain('/ads-bucket/ad-studio/ad_456-16x9.mp4');
      expect(requests[0].headers['content-type']).toBe('video/mp4');
      expect(requests[0].headers.authorization).toBeTruthy();
      expect(bodies[0].toString()).toBe('fake-mp4-bytes');
    } finally {
      server.close();
    }
  });

  it('partial S3 config degrades to the DB-fallback path instead of throwing', async () => {
    prismaMock.setting.findMany.mockResolvedValue([
      { key: 'STORAGE_PROVIDER', value: 's3' },
      { key: 'STORAGE_ENDPOINT', value: '' }, // incomplete
    ]);
    const bytes = Buffer.from('x');
    const result = await storeAdResult('ad_789', '9:16', bytes);
    expect(result.videoUrl).toContain('/api/ads/ad_789/download');
    expect(result.data).toBe(bytes.toString('base64'));
  });
});

describe('C1: GET /api/ads/:id/download serves the DB-fallback blob', () => {
  it('streams the stored MP4 with video/mp4 + nosniff', async () => {
    const b64 = Buffer.from('download-me').toString('base64');
    prismaMock.adVideo.findUnique.mockResolvedValue({ data: b64, format: '9:16' });

    const res = await request(app).get('/api/ads/ad_1/download');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('video/mp4');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.body.toString()).toBe('download-me');
  });

  it('returns 404 when the ad has no inline data (S3-backed or missing)', async () => {
    prismaMock.adVideo.findUnique.mockResolvedValue({ data: null, format: '9:16' });
    const res = await request(app).get('/api/ads/ad_2/download');
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown ad id', async () => {
    prismaMock.adVideo.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/ads/nope/download');
    expect(res.status).toBe(404);
  });
});

describe('C1 regression: list/detail never leak the base64 blob', () => {
  it('GET /api/ads selects fields excluding data', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_dev', role: 'SUPER_DEVELOPER', isActive: true });
    prismaMock.adVideo.findMany.mockResolvedValue([]);
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 'u_dev', email: 'dev@example.com', role: 'SUPER_DEVELOPER' }, process.env.JWT_SECRET || 'test-secret-for-unit-tests-0123456789', { expiresIn: '2h' });

    const res = await request(app).get('/api/ads').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const select = prismaMock.adVideo.findMany.mock.calls[0][0].select;
    expect(select.data).toBeUndefined();
    expect(select.id).toBe(true);
    expect(select.videoUrl).toBe(true);
  });

  it('GET /api/ads/:id selects fields excluding data', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_dev', role: 'SUPER_DEVELOPER', isActive: true });
    prismaMock.adVideo.findUnique.mockResolvedValue({ id: 'ad_1', sourceUrl: 'https://x.example.com', templateId: 'brand-intro', format: '9:16', status: 'DONE', videoUrl: 'https://v/x.mp4', script: {}, error: null, createdBy: 'u_dev', createdAt: new Date(), updatedAt: new Date() });
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ userId: 'u_dev', email: 'dev@example.com', role: 'SUPER_DEVELOPER' }, process.env.JWT_SECRET || 'test-secret-for-unit-tests-0123456789', { expiresIn: '2h' });

    const res = await request(app).get('/api/ads/ad_1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const select = prismaMock.adVideo.findUnique.mock.calls[0][0].select;
    expect(select.data).toBeUndefined();
  });
});

// Re-export guard: the StorageConfig type import must stay used for typing parity
// with storage.test.ts patterns.
export type { StorageConfig };
