import path from 'path';
import prisma from '@nexus/database';
import { putS3Object, getApiBase, type StorageConfig, isS3Configured } from './storage';

/**
 * One-time backfill: move existing base64 blobs (Media.data, AdVideo.data)
 * into object storage (R2/S3) and null them out. Frees Neon storage, shrinks
 * the db-mirror dump (M-mirror) and stops every asset view from burning CU.
 *
 * Safety model:
 *  - dryRun reports what WOULD move (counts + bytes), touches nothing.
 *  - An item is only cleared after its upload succeeds; one failure never
 *    aborts the batch.
 *  - Batches are capped so a single request cannot run for hours — re-run
 *    until the dry-run reports zero remaining.
 */

export interface BackfillReport {
  mediaRemaining: number;
  mediaBytes: number;
  adsRemaining: number;
  adsBytes: number;
  moved: { media: number; ads: number };
  failed: { media: number; ads: number };
  errors: string[];
}

const MAX_ITEMS_PER_RUN = 200;
// Keep each SELECT far below the ~2min statement timeout on hosted Postgres:
// small chunks also bound memory and dodge pooler streaming stalls (a full
// haul is ~322MB of base64, so we drain it a few rows at a time).
const BATCH_SIZE = 2;
const WATCHDOG_MS = 120_000;

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const guard = new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`timed out after ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([p, guard]).finally(() => clearTimeout(timer));
}

interface BlobCounts {
  n: number;
  bytes: number;
}

async function countBlobs(table: 'media' | 'ad_videos'): Promise<BlobCounts> {
  const rows = await withTimeout(
    prisma.$queryRawUnsafe<{ n: number; bytes: number }[]>(
      `SELECT COUNT(*)::int AS n, COALESCE(SUM(LENGTH(data)), 0)::int AS bytes
     FROM ${table} WHERE data IS NOT NULL`,
    ),
    WATCHDOG_MS,
    `count ${table}`,
  );
  const row = rows[0] ?? { n: 0, bytes: 0 };
  return { n: row.n, bytes: Math.ceil(row.bytes * 0.75) };
}

export function adObjectKey(id: string, format: string): string {
  return `ad-studio/${id}-${format.replace(':', 'x')}.mp4`;
}

function mediaObjectKey(storeId: string, mediaId: string, filename: string | null): string {
  return `${storeId}/${mediaId}${path.extname(filename || '')}`;
}

interface MediaChunkRow {
  id: string;
  storeId: string;
  alt: string;
  mimeType: string;
  data?: string | null;
}

export interface BackfillOptions {
  // When provided, blobs are pulled from this fetcher (e.g. the live API's
  // public /uploads route) instead of hauling base64 through the pooler —
  // which reliably stalls on multi-MB result sets.
  fetchBlob?: (row: MediaChunkRow) => Promise<Buffer>;
}

export async function backfillStorage(cfg: StorageConfig, dryRun: boolean, opts?: BackfillOptions): Promise<BackfillReport> {
  const report: BackfillReport = {
    mediaRemaining: 0,
    mediaBytes: 0,
    adsRemaining: 0,
    adsBytes: 0,
    moved: { media: 0, ads: 0 },
    failed: { media: 0, ads: 0 },
    errors: [],
  };

  const mediaCounts = await countBlobs('media');
  report.mediaRemaining = mediaCounts.n;
  report.mediaBytes = mediaCounts.bytes;

  const adCounts = await countBlobs('ad_videos');
  report.adsRemaining = adCounts.n;
  report.adsBytes = adCounts.bytes;

  if (dryRun || !isS3Configured(cfg)) return report;

  // ---- Media (batched) ----
  let mediaBudget = MAX_ITEMS_PER_RUN;
  while (mediaBudget > 0) {
    let chunk: MediaChunkRow[];
    try {
      chunk = await withTimeout(
        prisma.media.findMany({
          where: { data: { not: null } },
          select: opts?.fetchBlob
            ? { id: true, storeId: true, alt: true, mimeType: true }
            : { id: true, storeId: true, alt: true, mimeType: true, data: true },
          orderBy: { id: 'asc' },
          take: Math.min(BATCH_SIZE, mediaBudget),
        }),
        WATCHDOG_MS,
        'media chunk',
      );
    } catch (err: any) {
      console.error(`[backfill] chunk query failed: ${String(err?.message || err).slice(0, 160)}`);
      break; // resumable: cleared rows stay cleared; retry the run to continue
    }
    if (chunk.length === 0) break;
    for (const m of chunk) {
      mediaBudget--;
      try {
        const buffer = opts?.fetchBlob ? await withTimeout(opts.fetchBlob(m), WATCHDOG_MS, `fetch ${m.id}`) : Buffer.from(m.data!, 'base64');
        const key = mediaObjectKey(m.storeId, m.id, m.alt);
        await withTimeout(putS3Object(cfg, key, buffer, m.mimeType || 'application/octet-stream'), WATCHDOG_MS, `s3 put ${m.id}`);
        const url = `${cfg.publicBaseUrl}/${key}`;
        await withTimeout(prisma.media.update({ where: { id: m.id }, data: { url, thumbnailUrl: url, data: null } }), WATCHDOG_MS, `media update ${m.id}`);
        report.moved.media++;
      } catch (err: any) {
        report.failed.media++;
        const msg = `media ${m.id}: ${String(err?.message || err).slice(0, 200)}`;
        console.error(`[backfill] FAIL ${msg}`);
        if (report.errors.length < 10) report.errors.push(msg);
      }
    }
    console.log(`[backfill] media: +${chunk.length} processed (moved ${report.moved.media}, failed ${report.failed.media})`);
  }

  // ---- Ad videos (batched) ----
  let adBudget = MAX_ITEMS_PER_RUN;
  while (adBudget > 0) {
    let chunk: { id: string; format: string; data: string | null }[];
    try {
      chunk = await withTimeout(
        prisma.adVideo.findMany({
          where: { data: { not: null } },
          select: { id: true, format: true, data: true },
          orderBy: { id: 'asc' },
          take: Math.min(BATCH_SIZE, adBudget),
        }),
        WATCHDOG_MS,
        'ad chunk',
      );
    } catch (err: any) {
      console.error(`[backfill] chunk query failed: ${String(err?.message || err).slice(0, 160)}`);
      break;
    }
    if (chunk.length === 0) break;
    for (const ad of chunk) {
      adBudget--;
      try {
        const buffer = Buffer.from(ad.data!, 'base64');
        const key = adObjectKey(ad.id, ad.format);
        await withTimeout(putS3Object(cfg, key, buffer, 'video/mp4'), WATCHDOG_MS, `s3 put ${ad.id}`);
        await withTimeout(prisma.adVideo.update({ where: { id: ad.id }, data: { videoUrl: `${cfg.publicBaseUrl}/${key}`, data: null } }), WATCHDOG_MS, `ad update ${ad.id}`);
        report.moved.ads++;
      } catch (err: any) {
        report.failed.ads++;
        const msg = `ad ${ad.id}: ${String(err?.message || err).slice(0, 200)}`;
        console.error(`[backfill] FAIL ${msg}`);
        if (report.errors.length < 10) report.errors.push(msg);
      }
    }
    console.log(`[backfill] ads: +${chunk.length} processed (moved ${report.moved.ads}, failed ${report.failed.ads})`);
  }

  // Re-count what actually remains after this run.
  report.mediaRemaining = await prisma.media.count({ where: { data: { not: null } } });
  report.adsRemaining = await prisma.adVideo.count({ where: { data: { not: null } } });

  return report;
}

export interface ReferenceReport {
  scanned: { products: number; categories: number; brands: number; variants: number; stores: number; downloads: number };
  updated: { products: number; categories: number; brands: number; variants: number; stores: number; downloads: number };
  // Old upload-host URLs that pointed at a media row (so they SHOULD have a
  // migration target) but no map entry was found — e.g. media row already gone.
  remaining: number;
}

function emptyReferenceReport(): ReferenceReport {
  const zero = () => ({ products: 0, categories: 0, brands: 0, variants: 0, stores: 0, downloads: 0 });
  return { scanned: zero(), updated: zero(), remaining: 0 };
}

// Deterministic old→new mapping for the DB-backed upload URLs. The old URLs
// were always `${API_BASE}/uploads/<storeId>/<mediaId>` and the new ones
// `${publicBaseUrl}/<storeId>/<mediaId><ext>` — the same key scheme the
// backfill writes, so this stays correct even for already-migrated rows.
export function buildUploadUrlMap(
  mediaRows: { id: string; storeId: string; alt: string }[],
  cfg: StorageConfig,
): Record<string, string> {
  const api = getApiBase();
  const map: Record<string, string> = {};
  for (const m of mediaRows) {
    const old = `${api}/uploads/${m.storeId}/${m.id}`;
    const key = `${m.storeId}/${m.id}${path.extname(m.alt || '')}`;
    map[old] = `${cfg.publicBaseUrl}/${key}`;
  }
  return map;
}

/**
 * After blobs move to object storage the Media.url flips to the CDN origin,
 * but everything that still holds the OLD upload-host URL breaks (the
 * /uploads route returns null once `data` is cleared). Rewrites every
 * reference so images keep working: product.images, category.image,
 * brand.logo, variant.image, store.logoUrl and product_downloads.fileUrl.
 * Idempotent + safe to re-run; dryRun only reports.
 */
export async function rewriteUploadReferences(cfg: StorageConfig, opts?: { dryRun?: boolean }): Promise<ReferenceReport> {
  const dryRun = opts?.dryRun ?? true;
  const report = emptyReferenceReport();
  const orphans = new Set<string>();

  const mediaRows = await prisma.media.findMany({ select: { id: true, storeId: true, alt: true } });
  const map = buildUploadUrlMap(mediaRows, cfg);

  const products = await prisma.product.findMany({ select: { id: true, images: true } });
  report.scanned.products = products.length;
  let productsChanged = 0;
  for (const p of products) {
    const next: string[] = [];
    let hit = false;
    for (const url of p.images) {
      if (map[url]) { hit = true; next.push(map[url]); }
      else {
        if (url.startsWith(`${getApiBase()}/uploads/`)) orphans.add(url);
        next.push(url);
      }
    }
    if (hit) {
      productsChanged++;
      if (!dryRun) await prisma.product.update({ where: { id: p.id }, data: { images: next } });
    }
  }
  report.updated.products = productsChanged;

  async function rewriteSingle(delegate: { findMany: (a: any) => Promise<{ id: string; [k: string]: any }[]>; update: (a: any) => Promise<any> }, field: string, counter: 'categories' | 'brands' | 'variants' | 'stores' | 'downloads') {
    const rows = await delegate.findMany({ select: { id: true, [field]: true } });
    report.scanned[counter] = rows.length;
    let changed = 0;
    for (const row of rows) {
      const value: string = row[field];
      if (value && !map[value]) {
        if (value.startsWith(`${getApiBase()}/uploads/`)) orphans.add(value);
        continue;
      }
      if (!map[value]) continue;
      changed++;
      if (!dryRun) await delegate.update({ where: { id: row.id }, data: { [field]: map[value] } });
    }
    report.updated[counter] = changed;
  }

  await rewriteSingle(prisma.category, 'image', 'categories');
  await rewriteSingle(prisma.brand, 'logo', 'brands');
  await rewriteSingle(prisma.productVariant, 'image', 'variants');
  await rewriteSingle(prisma.store, 'logoUrl', 'stores');
  await rewriteSingle(prisma.productDownload, 'fileUrl', 'downloads');

  report.remaining = orphans.size;
  return report;
}
