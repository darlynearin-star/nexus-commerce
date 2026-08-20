import { Router } from 'express';
import prisma from '@nexus/database';
import { UserRole } from '@nexus/shared';
import { authenticate, requireRole } from '../middleware/auth';
import { logActivity } from '../utils/activity-log';
import { cacheGet, cacheSet, clearCache } from './cache';
import { sendEmail, announcementEmailHtml } from '../utils/email';
import { ANNOUNCEMENT_TEMPLATES } from '../announcement-templates';

export const announcementsRouter = Router();

// Accepts either an array of emails or a comma-separated string; validates
// loosely and returns only well-formed addresses.
function normalizeRecipients(raw: unknown): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(',').map(s => s.trim());
  return list.filter((e: any) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).map((e: any) => e.trim());
}

async function emailRecipients(recipients: string[], title: string, message: string) {
  const results: { to: string; success: boolean; message: string }[] = [];
  for (const to of recipients) {
    const result = await sendEmail({ to, subject: `[Lyn-nyx Stores] ${title}`, text: message, html: announcementEmailHtml({ title, message }) });
    results.push({ to, success: result.success, message: result.message });
  }
  return results;
}

announcementsRouter.get('/', async (_req, res, next) => {
  try {
    const cached = cacheGet('public:announcements');
    if (cached) return res.json({ success: true, data: cached });

    const setting = await prisma.setting.findUnique({ where: { key: 'platform_announcements' } });
    const announcements = (setting?.value as any[]) || [];
    const now = new Date();
    const active = announcements.filter((a: any) => {
      if (!a.active) return false;
      if (a.startsAt && new Date(a.startsAt) > now) return false;
      if (a.endsAt && new Date(a.endsAt) < now) return false;
      return true;
    });

    cacheSet('public:announcements', active, 30000);
    res.json({ success: true, data: active });
  } catch (error) { next(error); }
});

announcementsRouter.get('/templates', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), (_req, res) => {
  res.json({ success: true, data: ANNOUNCEMENT_TEMPLATES });
});

announcementsRouter.get('/all', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (_req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'platform_announcements' } });
    res.json({ success: true, data: (setting?.value as any[]) || [] });
  } catch (error) { next(error); }
});

announcementsRouter.post('/', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const { title, message, type, priority, startsAt, endsAt } = req.body;
    const recipients = normalizeRecipients(req.body.recipients);
    const setting = await prisma.setting.findUnique({ where: { key: 'platform_announcements' } });
    const announcements: any[] = (setting?.value as any[]) || [];
    announcements.push({
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title, message, type: type || 'INFO', priority: priority || 'NORMAL',
      startsAt: startsAt || null, endsAt: endsAt || null,
      recipients: recipients.length ? recipients : undefined,
      active: true, createdBy: (req as any).user!.userId, createdAt: new Date().toISOString(),
    });
    await prisma.setting.upsert({
      where: { key: 'platform_announcements' },
      update: { value: announcements },
      create: { key: 'platform_announcements', value: announcements },
    });
    logActivity({ userId: (req as any).user!.userId, action: 'announcement:created', resource: 'announcement', details: { title, recipients: recipients.length }, req: req as any });
    clearCache('public:announcements');
    const emailResults = recipients.length ? await emailRecipients(recipients, title, message) : [];
    res.json({ success: true, data: announcements, emailResults });
  } catch (error) { next(error); }
});

announcementsRouter.put('/:id', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'platform_announcements' } });
    const announcements: any[] = (setting?.value as any[]) || [];
    const idx = announcements.findIndex((a: any) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Announcement not found' });
    const { title, message, type, priority, startsAt, endsAt, active, sendEmail } = req.body;
    const recipients = normalizeRecipients(req.body.recipients);
    announcements[idx] = { ...announcements[idx] };
    if (title !== undefined) announcements[idx].title = title;
    if (message !== undefined) announcements[idx].message = message;
    if (type !== undefined) announcements[idx].type = type;
    if (priority !== undefined) announcements[idx].priority = priority;
    if (startsAt !== undefined) announcements[idx].startsAt = startsAt;
    if (endsAt !== undefined) announcements[idx].endsAt = endsAt;
    if (active !== undefined) announcements[idx].active = active;
    if (recipients.length) announcements[idx].recipients = recipients;
    await prisma.setting.upsert({
      where: { key: 'platform_announcements' },
      update: { value: announcements },
      create: { key: 'platform_announcements', value: announcements },
    });
    logActivity({ userId: (req as any).user!.userId, action: 'announcement:updated', resource: 'announcement', details: { id: req.params.id }, req: req as any });
    clearCache('public:announcements');
    // Emails are only (re)sent on update when explicitly requested via sendEmail.
    const emailResults = sendEmail && announcements[idx].recipients?.length
      ? await emailRecipients(announcements[idx].recipients, announcements[idx].title, announcements[idx].message)
      : [];
    res.json({ success: true, data: announcements, emailResults });
  } catch (error) { next(error); }
});

announcementsRouter.delete('/:id', authenticate, requireRole(UserRole.DEVELOPER, UserRole.SUPER_DEVELOPER), async (req, res, next) => {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: 'platform_announcements' } });
    const announcements: any[] = (setting?.value as any[]) || [];
    const filtered = announcements.filter((a: any) => a.id !== req.params.id);
    await prisma.setting.upsert({
      where: { key: 'platform_announcements' },
      update: { value: filtered },
      create: { key: 'platform_announcements', value: filtered },
    });
    logActivity({ userId: (req as any).user!.userId, action: 'announcement:deleted', resource: 'announcement', details: { id: req.params.id }, req: req as any });
    clearCache('public:announcements');
    res.json({ success: true, data: filtered });
  } catch (error) { next(error); }
});
