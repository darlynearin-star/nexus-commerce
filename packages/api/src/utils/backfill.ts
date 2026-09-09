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

export function adObjectKey(id: string, format: string): string {
  return `ad-studio/${id}-${format.replace(':', 'x')}.mp4`;
}

function mediaObjectKey(storeId: string, mediaId: string, filename: string | null): string {
  return `${storeId}/${mediaId}${path.extname(filename || '')}`;
}

export async function backfillStorage(cfg: StorageConfig, dryRun: boolean): Promise<BackfillReport> {
  const report: BackfillReport = {
    mediaRemaining: 0,
    mediaBytes: 0,
    adsRemaining: 0,
    adsBytes: 0,
    moved: { media: 0, ads: 0 },
    failed: { media: 0, ads: 0 },
    errors: [],
  };

  const mediaBlobs = await prisma.media.findMany({
    where: { data: { not: null } },
    select: { id: true, storeId: true, alt: true, mimeType: true, data: true },
  });
  report.mediaRemaining = mediaBlobs.length;
  report.mediaBytes = mediaBlobs.reduce((sum, m) => sum + Math.ceil((m.data?.length || 0) * 0.75), 0);

  const adBlobs = await prisma.adVideo.findMany({
    where: { data: { not: null } },
    select: { id: true, format: true, data: true },
  });
  report.adsRemaining = adBlobs.length;
  report.adsBytes = adBlobs.reduce((sum, a) => sum + Math.ceil((a.data?.length || 0) * 0.75), 0);

  if (dryRun || !isS3Configured(cfg)) return report;

  // ---- Media ----
  let mediaBudget = MAX_ITEMS_PER_RUN;
  for (const m of mediaBlobs) {
    if (mediaBudget-- <= 0) break;
    try {
      const buffer = Buffer.from(m.data!, 'base64');
      const key = mediaObjectKey(m.storeId, m.id, m.alt);
      await putS3Object(cfg, key, buffer, m.mimeType || 'application/octet-stream');
      const url = `${cfg.publicBaseUrl}/${key}`;
      await prisma.media.update({ where: { id: m.id }, data: { url, thumbnailUrl: url, data: null } });
      report.moved.media++;
    } catch (err: any) {
      report.failed.media++;
      if (report.errors.length < 10) report.errors.push(`media ${m.id}: ${String(err?.message || err).slice(0, 200)}`);
    }
  }

  // ---- Ad videos ----
  let adBudget = MAX_ITEMS_PER_RUN;
  for (const ad of adBlobs) {
    if (adBudget-- <= 0) break;
    try {
      const buffer = Buffer.from(ad.data!, 'base64');
      const key = adObjectKey(ad.id, ad.format);
      await putS3Object(cfg, key, buffer, 'video/mp4');
      await prisma.adVideo.update({ where: { id: ad.id }, data: { videoUrl: `${cfg.publicBaseUrl}/${key}`, data: null } });
      report.moved.ads++;
    } catch (err: any) {
      report.failed.ads++;
      if (report.errors.length < 10) report.errors.push(`ad ${ad.id}: ${String(err?.message || err).slice(0, 200)}`);
    }
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
