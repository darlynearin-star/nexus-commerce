import { Router } from 'express';
import prisma from '@nexus/database';
import { UserRole } from '@nexus/shared';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';
import { AD_VIDEO_TEMPLATES, getAdTemplate } from '../ad-video-templates';
import { runAdVideoJob, renderCapabilities } from '../utils/ad-render';

export const adsRouter = Router();

const ALLOWED_FORMATS = new Set(['9:16', '16:9']);

// Never select AdVideo.data outside the download route — it can hold the
// entire base64 MP4.
const AD_VIDEO_FIELDS = {
  id: true, sourceUrl: true, templateId: true, format: true, status: true,
  videoUrl: true, script: true, error: true, createdBy: true, createdAt: true, updatedAt: true,
};

function isUrl(s: unknown): boolean {
  return typeof s === 'string' && /^https?:\/\//i.test(s.trim());
}

function stripPrivate(row: any): any {
  // Nothing sensitive on AdVideo today, but keep the helper consistent with other routes.
  return row;
}

adsRouter.get('/templates', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), (_req, res) => {
  res.json({ success: true, data: AD_VIDEO_TEMPLATES });
});

adsRouter.get('/capabilities', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), (_req, res) => {
  const caps = renderCapabilities();
  const ffmpegHint = caps.ffmpeg ? null : 'ffmpeg not on PATH — ads render as FAILED until the Render Dockerfile is deployed';
  res.json({ success: true, data: { ...caps, hint: ffmpegHint } });
});

adsRouter.get('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (_req, res, next) => {
  try {
    const rows = await prisma.adVideo.findMany({ orderBy: { createdAt: 'desc' }, take: 100, select: AD_VIDEO_FIELDS });
    res.json({ success: true, data: rows.map(stripPrivate) });
  } catch (e) { next(e); }
});

adsRouter.get('/:id', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const row = await prisma.adVideo.findUnique({ where: { id: req.params.id }, select: AD_VIDEO_FIELDS });
    if (!row) return res.status(404).json({ success: false, error: 'Ad not found' });
    res.json({ success: true, data: stripPrivate(row) });
  } catch (e) { next(e); }
});

// DB-fallback serving for rendered ads. Public capability URL (UUID-keyed,
// same trust model as /uploads) — the dashboard's Copy-link/Open buttons are
// meant for sharing. S3/R2-backed ads never hit this route (their videoUrl
// points at the object-storage public base URL).
adsRouter.get('/:id/download', async (req, res) => {
  try {
    const row = await prisma.adVideo.findUnique({ where: { id: req.params.id }, select: { data: true, format: true } });
    if (!row?.data) return res.status(404).send('Not found');
    const buffer = Buffer.from(row.data, 'base64');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Accept-Ranges', 'none');
    res.send(buffer);
  } catch {
    res.status(500).send('Server error');
  }
});

adsRouter.post('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const { sourceUrl, templateId, format } = req.body as { sourceUrl?: string; templateId?: string; format?: string };
    const fmt = (format || '9:16').trim();
    if (!isUrl(sourceUrl)) return res.status(400).json({ success: false, error: 'sourceUrl must be http(s)://...' });
    if (!templateId || !getAdTemplate(templateId)) return res.status(400).json({ success: false, error: `Unknown templateId ${templateId}` });
    if (!ALLOWED_FORMATS.has(fmt)) return res.status(400).json({ success: false, error: 'format must be 9:16 or 16:9' });

    const template = getAdTemplate(templateId)!;
    const row = await prisma.adVideo.create({
      data: {
        sourceUrl: String(sourceUrl).trim(),
        templateId,
        format: fmt,
        status: 'QUEUED',
        script: template.beats as any,
        createdBy: (req as any).user?.userId || null,
      },
    });
    logActivity({ userId: (req as any).user!.userId, action: 'ad:created', resource: 'ad_video', resourceId: row.id, details: { sourceUrl, templateId, format: fmt }, req: req as any });
    res.status(201).json({ success: true, data: stripPrivate(row) });

    // Fire-and-forget so the POST isn't held open while ffmpeg renders.
    // On the free tier the worker keeps the event loop alive until the render
    // finishes; Render does not kill an in-flight request-handler's detached
    // async work while the process is up.
    setImmediate(() => {
      void runAdVideoJob(row.id);
    });
  } catch (e) { next(e); }
});

// Convenience batch: pasted URL × many templates in one call.
adsRouter.post('/batch', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const { sourceUrl, templateIds, format } = req.body as { sourceUrl?: string; templateIds?: string[]; format?: string };
    const fmt = (format || '9:16').trim();
    if (!isUrl(sourceUrl)) return res.status(400).json({ success: false, error: 'sourceUrl must be http(s)://...' });
    const ids: string[] = Array.isArray(templateIds) ? templateIds : [];
    if (ids.length === 0) return res.status(400).json({ success: false, error: 'templateIds is required (array)' });
    const bad = ids.find(id => !getAdTemplate(id));
    if (bad) return res.status(400).json({ success: false, error: `Unknown templateId ${bad}` });
    if (!ALLOWED_FORMATS.has(fmt)) return res.status(400).json({ success: false, error: 'format must be 9:16 or 16:9' });

    const rows: any[] = [];
    for (const templateId of ids) {
      const template = getAdTemplate(templateId)!;
      const row = await prisma.adVideo.create({
        data: { sourceUrl: String(sourceUrl).trim(), templateId, format: fmt, status: 'QUEUED', script: template.beats as any, createdBy: (req as any).user?.userId || null },
      });
      rows.push(row);
      setImmediate(() => { void runAdVideoJob(row.id); });
    }
    logActivity({ userId: (req as any).user!.userId, action: 'ad:batch_created', resource: 'ad_video', details: { sourceUrl, count: rows.length }, req: req as any });
    res.status(201).json({ success: true, data: rows.map(stripPrivate) });
  } catch (e) { next(e); }
});

adsRouter.delete('/:id', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const row = await prisma.adVideo.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ success: false, error: 'Ad not found' });
    await prisma.adVideo.delete({ where: { id: req.params.id } });
    logActivity({ userId: (req as any).user!.userId, action: 'ad:deleted', resource: 'ad_video', resourceId: req.params.id, req: req as any });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// Retry a FAILED job (re-queues it).
adsRouter.post('/:id/retry', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const row = await prisma.adVideo.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ success: false, error: 'Ad not found' });
    if (row.status !== 'FAILED') return res.status(400).json({ success: false, error: 'Only FAILED jobs can be retried' });
    const updated = await prisma.adVideo.update({ where: { id: req.params.id }, data: { status: 'QUEUED', error: null } });
    logActivity({ userId: (req as any).user!.userId, action: 'ad:retry', resource: 'ad_video', resourceId: req.params.id, req: req as any });
    res.json({ success: true, data: stripPrivate(updated) });
    setImmediate(() => { void runAdVideoJob(updated.id); });
  } catch (e) { next(e); }
});
