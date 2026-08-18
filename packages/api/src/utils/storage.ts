import crypto from 'crypto';
import path from 'path';
import prisma from '@nexus/database';

const API_BASE = process.env.RENDER_EXTERNAL_URL || 'https://nexus-api-69q5.onrender.com';

// Server-derived content type from the file extension, never the client-supplied
// mimetype, so a spoofed file cannot be served as active content.
const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export function mimeFromFilename(filename: string): string {
  return EXT_TO_MIME[path.extname(filename).toLowerCase()] || 'application/octet-stream';
}

export type StorageBackend = 'db' | 's3';

export interface StorageConfig {
  provider: StorageBackend;
  endpoint?: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucket?: string;
  publicBaseUrl?: string;
  forcePathStyle: boolean;
}

export function getStorageConfig(): StorageConfig {
  const provider = (process.env.STORAGE_PROVIDER || 'db').toLowerCase();
  if (provider === 's3') {
    return {
      provider: 's3',
      endpoint: process.env.STORAGE_ENDPOINT,
      region: process.env.STORAGE_REGION || 'auto',
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
      bucket: process.env.STORAGE_BUCKET,
      publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
      forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
    };
  }
  return { provider: 'db', region: 'auto', forcePathStyle: false };
}

export function isS3Configured(cfg: StorageConfig): boolean {
  return (
    cfg.provider === 's3' &&
    !!cfg.endpoint &&
    !!cfg.accessKeyId &&
    !!cfg.secretAccessKey &&
    !!cfg.bucket
  );
}

// ---- AWS Signature V4 (S3-compatible: R2 / MinIO / AWS) ----

function hmac(key: Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(Buffer.from(`AWS4${secret}`, 'utf8'), dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function amzDateParts(date = new Date()): { amzDate: string; dateStamp: string } {
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function uriEncode(segment: string): string {
  return encodeURIComponent(segment).replace(/%2F/gi, '/');
}

interface S3Request {
  cfg: StorageConfig;
  method: string;
  key: string;
  body: Buffer;
  contentType?: string;
}

// Builds the SigV4 Authorization header for an S3-compatible request.
export function signS3Request(req: S3Request): { host: string; path: string; headers: Record<string, string> } {
  const { cfg, method, key } = req;
  const endpoint = new URL(cfg.endpoint!);
  const bucket = cfg.bucket!;
  const host = cfg.forcePathStyle ? endpoint.host : `${bucket}.${endpoint.host}`;
  const path = cfg.forcePathStyle ? `/${bucket}${uriEncode(key)}` : `/${uriEncode(key)}`;
  const payloadHash = req.body.length === 0 ? EMPTY_SHA256 : sha256Hex(req.body.toString('utf8'));
  const { amzDate, dateStamp } = amzDateParts();
  const region = cfg.region;

  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (req.contentType) headers['content-type'] = req.contentType;

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((h) => `${h}:${headers[h].trim()}`)
    .join('\n');
  const signedHeaders = Object.keys(headers).sort().join(';');

  const canonicalRequest = [
    method,
    path,
    '',
    canonicalHeaders,
    '',
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signature = hmac(signingKey(cfg.secretAccessKey!, dateStamp, region, 's3'), stringToSign).toString('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${cfg.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return { host, path, headers: { ...headers, authorization } };
}

async function s3Request(req: S3Request): Promise<Buffer> {
  const { cfg, method, key, body, contentType } = req;
  const signed = signS3Request(req);
  const endpoint = new URL(cfg.endpoint!);
  const url = `${endpoint.protocol}//${signed.host}${signed.path}`;

  const res = await fetch(url, {
    method,
    headers: { ...signed.headers, authorization: signed.headers.authorization },
    body: method === 'PUT' || method === 'POST' ? body : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Storage ${method} ${key} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function putS3Object(cfg: StorageConfig, key: string, body: Buffer, contentType: string): Promise<void> {
  await s3Request({ cfg, method: 'PUT', key, body, contentType });
}

async function getS3Object(cfg: StorageConfig, key: string): Promise<Buffer> {
  return s3Request({ cfg, method: 'GET', key, body: Buffer.alloc(0) });
}

async function deleteS3Object(cfg: StorageConfig, key: string): Promise<void> {
  await s3Request({ cfg, method: 'DELETE', key, body: Buffer.alloc(0) });
}

function objectKey(storeId: string, mediaId: string, filename: string): string {
  return `${storeId}/${mediaId}${path.extname(filename)}`;
}

// ---- Storage interface ----

export interface StoreMediaInput {
  storeId: string;
  buffer: Buffer;
  filename: string;
  folder?: string;
  productId?: string | null;
}

export const storage = {
  async store(input: StoreMediaInput, cfg: StorageConfig = getStorageConfig()) {
    const safeMime = mimeFromFilename(input.filename);
    const base = {
      storeId: input.storeId,
      alt: input.filename,
      type: safeMime.startsWith('image/') ? 'image' : 'document',
      mimeType: safeMime,
      size: input.buffer.length,
      folder: input.folder || 'general',
      productId: input.productId || null,
    };
    if (isS3Configured(cfg)) {
      const key = objectKey(input.storeId, crypto.randomUUID(), input.filename);
      await putS3Object(cfg, key, input.buffer, safeMime);
      const media = await prisma.media.create({ data: { ...base, url: '', thumbnailUrl: '' } });
      const url = `${cfg.publicBaseUrl}/${key}`;
      await prisma.media.update({ where: { id: media.id }, data: { url, thumbnailUrl: url } });
      const { data: _data, ...safeMedia } = media;
      return { media: { ...safeMedia, url, thumbnailUrl: url } };
    }
    const media = await prisma.media.create({
      data: { ...base, url: '', thumbnailUrl: '', data: input.buffer.toString('base64') },
    });
    const url = `${API_BASE}/uploads/${input.storeId}/${media.id}`;
    await prisma.media.update({ where: { id: media.id }, data: { url, thumbnailUrl: url } });
    const { data: _data, ...safeMedia } = media;
    return { media: { ...safeMedia, url, thumbnailUrl: url } };
  },

  async retrieve(storeId: string, mediaId: string, cfg: StorageConfig = getStorageConfig()) {
    const media = await prisma.media.findFirst({ where: { id: mediaId, storeId } });
    if (!media) return null;
    const safeMime = mimeFromFilename(media.alt);
    if (media.data) {
      return {
        buffer: Buffer.from(media.data, 'base64'),
        mimeType: safeMime,
        filename: media.alt || 'file',
        type: media.type,
      };
    }
    if (isS3Configured(cfg) && media.url.startsWith(cfg.publicBaseUrl || '')) {
      const key = media.url.slice((cfg.publicBaseUrl || '').length + 1);
      const buffer = await getS3Object(cfg, key);
      return { buffer, mimeType: safeMime, filename: media.alt || 'file', type: media.type };
    }
    return null;
  },

  async remove(storeId: string, mediaId: string, cfg: StorageConfig = getStorageConfig()) {
    const media = await prisma.media.findFirst({ where: { id: mediaId, storeId } });
    if (!media) return null;
    if (!media.data && isS3Configured(cfg) && media.url.startsWith(cfg.publicBaseUrl || '')) {
      const key = media.url.slice((cfg.publicBaseUrl || '').length + 1);
      await deleteS3Object(cfg, key).catch(() => {});
    }
    return media;
  },
};