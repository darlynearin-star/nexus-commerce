import path from 'path';
import prisma from '@nexus/database';
import { putS3Object, type StorageConfig, isS3Configured } from './storage';

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
