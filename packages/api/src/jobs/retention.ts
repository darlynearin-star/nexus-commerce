import prisma from '@nexus/database';
import { logger } from '../utils/logger';

/**
 * M-prune: unbounded tables (analytics_events, activity_logs, notifications,
 * dead sessions) grow forever, making every scan progressively more expensive
 * (Neon CU burn compounds). Daily sweeps bound them.
 *
 * Thresholds (days) are env-tunable; RETENTION_DISABLED=true skips all sweeps.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

function days(env: string, fallback: number): number {
  const n = parseInt(process.env[env] || '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export interface RetentionResult {
  analyticsEvents: number;
  activityLogs: number;
  notifications: number;
  sessions: number;
}

export async function runRetentionSweeps(): Promise<RetentionResult> {
  const result: RetentionResult = { analyticsEvents: 0, activityLogs: 0, notifications: 0, sessions: 0 };
  if (process.env.RETENTION_DISABLED === 'true') return result;

  const now = Date.now();
  const sweeps: [keyof RetentionResult, string, () => Promise<number>][] = [
    ['analyticsEvents', 'analytics_events', () => prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(now - days('RETENTION_ANALYTICS_DAYS', 90) * DAY_MS) } } })],
    ['activityLogs', 'activity_logs', () => prisma.activityLog.deleteMany({ where: { createdAt: { lt: new Date(now - days('RETENTION_ACTIVITY_DAYS', 365) * DAY_MS) } } })],
    ['notifications', 'notifications', () => prisma.notification.deleteMany({ where: { isRead: true, createdAt: { lt: new Date(now - days('RETENTION_NOTIFICATIONS_DAYS', 30) * DAY_MS) } } })],
    ['sessions', 'sessions', () => prisma.session.deleteMany({ where: { OR: [{ isActive: false }, { expiresAt: { lt: new Date(now - days('RETENTION_SESSIONS_DAYS', 7) * DAY_MS) } }] } })],
  ];

  for (const [key, name, sweep] of sweeps) {
    // Isolated: one failing sweep must not stop the others.
    try {
      const r = await sweep();
      result[key] = r.count;
      if (r.count > 0) logger.info(`Retention: pruned ${r.count} ${name}`);
    } catch (e: any) {
      logger.warn(`Retention sweep failed for ${name}: ${e?.message || e}`);
    }
  }
  return result;
}
