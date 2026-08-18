import { describe, it, expect, beforeEach, vi } from 'vitest';
import http from 'node:http';
import { AddressInfo } from 'node:net';

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

import { mimeFromFilename, getStorageConfig, isS3Configured, signS3Request, storage, StorageConfig } from './storage';

function listen(): Promise<{ server: http.Server; port: number; requests: http.IncomingMessage[] }> {
  return new Promise((resolve) => {
    const requests: http.IncomingMessage[] = [];
    const server = http.createServer((req, res) => {
      requests.push(req);
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        (req as any).rawBody = Buffer.from(body);
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(Buffer.from('stored-bytes'));
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, port, requests });
    });
  });
}

function s3Cfg(port: number): StorageConfig {
  return {
    provider: 's3',
    endpoint: `http://127.0.0.1:${port}`,
    region: 'auto',
    accessKeyId: 'TESTAKID',
    secretAccessKey: 'TESTSECRET',
    bucket: 'media-bucket',
    publicBaseUrl: `http://127.0.0.1:${port}/public`,
    forcePathStyle: true,
  };
}

describe('storage config', () => {
  it('defaults to the db backend', () => {
    expect(getStorageConfig().provider).toBe('db');
    expect(isS3Configured(getStorageConfig())).toBe(false);
  });

  it('detects a complete s3 configuration', () => {
    const cfg = s3Cfg(0);
    expect(isS3Configured(cfg)).toBe(true);
    const incomplete = { ...cfg, secretAccessKey: undefined };
    expect(isS3Configured(incomplete)).toBe(false);
  });

  it('maps file extensions to safe mime types', () => {
    expect(mimeFromFilename('photo.PNG')).toBe('image/png');
    expect(mimeFromFilename('video.mp4')).toBe('video/mp4');
    expect(mimeFromFilename('weird.xyz')).toBe('application/octet-stream');
  });
});

describe('sigv4 signing', () => {
  it('produces a well-formed AWS4-HMAC-SHA256 authorization header', () => {
    const { headers } = signS3Request({
      cfg: s3Cfg(0),
      method: 'PUT',
      key: 'store_1/abc123.png',
      body: Buffer.from('hello'),
    });
    const auth = headers.authorization;
    expect(auth.startsWith('AWS4-HMAC-SHA256 ')).toBe(true);
    expect(auth).toContain('Credential=TESTAKID/');
    expect(auth).toContain('/auto/s3/aws4_request');
    expect(auth).toContain('SignedHeaders=host;x-amz-content-sha256;x-amz-date');
    const sig = auth.match(/Signature=([0-9a-f]{64})/);
    expect(sig).not.toBeNull();
  });

  it('round-trips a signed PUT and GET to a live (mock) endpoint', async () => {
    const { server, port, requests } = await listen();
    try {
      const cfg = s3Cfg(port);
      prismaMock.media.create.mockResolvedValue({
        id: 'm1',
        storeId: 'store_1',
        url: '',
        thumbnailUrl: '',
        alt: 'pic.png',
        type: 'image',
        mimeType: 'image/png',
        size: 10,
        folder: 'general',
        productId: null,
        data: undefined,
      });
      await storage.store(
        { storeId: 'store_1', buffer: Buffer.from('image-bytes'), filename: 'pic.png' },
        cfg,
      );
      expect(prismaMock.media.create).toHaveBeenCalled();
      const createArgs = prismaMock.media.create.mock.calls[0][0].data;
      expect(createArgs.data).toBeUndefined();
      expect(createArgs.mimeType).toBe('image/png');

      const putReq = requests[0];
      expect(putReq.method).toBe('PUT');
      expect(putReq.headers.authorization).toBeTruthy();
      expect(putReq.headers['x-amz-content-sha256']).toBeTruthy();

      // GET path: resolve a DB row without inline data, stream from the endpoint.
      prismaMock.media.findFirst.mockResolvedValue({
        id: 'm1',
        storeId: 'store_1',
        url: `${cfg.publicBaseUrl}/store_1/m1.png`,
        alt: 'pic.png',
        type: 'image',
        mimeType: 'image/png',
        data: null,
      });
      const result = await storage.retrieve('store_1', 'm1', cfg);
      expect(result).not.toBeNull();
      expect(result!.buffer.toString()).toBe('stored-bytes');
      expect(result!.mimeType).toBe('image/png');
    } finally {
      server.close();
    }
  });
});

describe('db backend', () => {
  it('stores base64 and serves it back unchanged', async () => {
    const bytes = Buffer.from('db-stored-bytes');
    prismaMock.media.create.mockResolvedValue({
      id: 'm1',
      storeId: 'store_1',
      url: '',
      thumbnailUrl: '',
      alt: 'doc.pdf',
      type: 'document',
      mimeType: 'application/pdf',
      size: bytes.length,
      data: bytes.toString('base64'),
      folder: 'general',
      productId: null,
    });
    const { media } = await storage.store(
      { storeId: 'store_1', buffer: bytes, filename: 'doc.pdf' },
      getStorageConfig(),
    );
    expect(prismaMock.media.create).toHaveBeenCalled();
    expect(prismaMock.media.create.mock.calls[0][0].data.data).toBe(bytes.toString('base64'));
    expect(media.url).toContain('/uploads/store_1/m1');

    prismaMock.media.findFirst.mockResolvedValue({
      id: 'm1',
      storeId: 'store_1',
      url: media.url,
      alt: 'doc.pdf',
      type: 'document',
      data: bytes.toString('base64'),
    });
    const retrieved = await storage.retrieve('store_1', 'm1', getStorageConfig());
    expect(retrieved!.buffer.equals(bytes)).toBe(true);
    expect(retrieved!.mimeType).toBe('application/pdf');
  });

  it('returns null for a missing row', async () => {
    prismaMock.media.findFirst.mockResolvedValue(null);
    expect(await storage.retrieve('store_1', 'nope')).toBeNull();
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});