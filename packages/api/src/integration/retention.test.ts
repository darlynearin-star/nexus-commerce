import { describe, it, expect, beforeEach, vi } from 'vitest';

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

import { runRetentionSweeps } from '../jobs/retention';

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.RETENTION_DISABLED;
  prismaMock.analyticsEvent.deleteMany.mockResolvedValue({ count: 3 });
  prismaMock.activityLog.deleteMany.mockResolvedValue({ count: 4 });
  prismaMock.notification.deleteMany.mockResolvedValue({ count: 5 });
  prismaMock.session.deleteMany.mockResolvedValue({ count: 6 });
});

describe('M-prune: retention sweeps', () => {
  it('runs all four sweeps and reports counts', async () => {
    const result = await runRetentionSweeps();
    expect(result).toEqual({ analyticsEvents: 3, activityLogs: 4, notifications: 5, sessions: 6 });
    expect(prismaMock.analyticsEvent.deleteMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) }),
    );
  });

  it('notifications sweep only prunes READ notifications', async () => {
    await runRetentionSweeps();
    expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isRead: true }) }),
    );
  });

  it('one failing sweep does not abort the others', async () => {
    prismaMock.analyticsEvent.deleteMany.mockRejectedValue(new Error('db gone'));
    const result = await runRetentionSweeps();
    expect(result.analyticsEvents).toBe(0);
    expect(result.activityLogs).toBe(4);
    expect(result.notifications).toBe(5);
    expect(result.sessions).toBe(6);
  });

  it('RETENTION_DISABLED=true skips everything', async () => {
    process.env.RETENTION_DISABLED = 'true';
    const result = await runRetentionSweeps();
    expect(result).toEqual({ analyticsEvents: 0, activityLogs: 0, notifications: 0, sessions: 0 });
    expect(prismaMock.analyticsEvent.deleteMany).not.toHaveBeenCalled();
  });
});
