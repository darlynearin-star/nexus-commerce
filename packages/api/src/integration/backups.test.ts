import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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

const app = createApp();
const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';

function devToken(): string {
  return jwt.sign({ userId: 'u_dev', email: 'dev@example.com', role: 'SUPER_DEVELOPER' }, JWT_SECRET, { expiresIn: '2h' });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u_dev', role: 'SUPER_DEVELOPER', isActive: true });
  prismaMock.setting.findUnique.mockResolvedValue(null);
  // $-methods live on the ROOT prisma object (not a model) — the proxy would
  // otherwise auto-create a non-callable model for them.
  (prismaMock as any).$queryRawUnsafe = vi.fn(async (sql: string) => {
    const m = sql.match(/FROM "([a-z_]+)"/);
    return [{ id: `row-${m?.[1]}` }];
  });
});

describe('H8: backup dump policy + retention', () => {
  it('dump EXCLUDES media blobs and sessions, includes core tables', async () => {
    const res = await request(app).post('/api/backups/create').set('Authorization', `Bearer ${devToken()}`);

    expect(res.status).toBe(200);
    const sqls = prismaMock.$queryRawUnsafe.mock.calls.map((c: any) => c[0] as string);
    expect(sqls.some(s => s.includes('FROM "users"'))).toBe(true);
    expect(sqls.some(s => s.includes('FROM "orders"'))).toBe(true);
    expect(sqls.some(s => s.includes('FROM "media"'))).toBe(false);
    expect(sqls.some(s => s.includes('FROM "sessions"'))).toBe(false);
    // Create responds with metadata only — not the whole dump.
    expect(res.body.data.data).toBeUndefined();
    expect(res.body.data.rowCount).toBeGreaterThan(0);
  });

  it('enforces retention: oldest backups are dropped beyond the limit', async () => {
    const old = Array.from({ length: 5 }, (_, i) => ({ id: `backup-old-${i}`, createdAt: new Date(2020, 0, i + 1).toISOString(), data: {} }));
    prismaMock.setting.findUnique.mockResolvedValue({ key: 'database_backups', value: old });

    const res = await request(app).post('/api/backups/create').set('Authorization', `Bearer ${devToken()}`);

    expect(res.status).toBe(200);
    const upsert = prismaMock.setting.upsert.mock.calls[0][0];
    const kept: any[] = upsert.update.value;
    expect(kept.length).toBe(5); // 5 old + 1 new → newest 5 kept
    expect(kept.some((b: any) => b.id.startsWith('backup-') && !b.id.startsWith('backup-old'))).toBe(true);
    expect(kept.some((b: any) => b.id === 'backup-old-0')).toBe(false); // oldest dropped
    expect(res.body.data.dropped).toBe(1);
  });

  it('refuses to store an oversized snapshot (413) instead of blowing up the settings row', async () => {
    (prismaMock as any).$queryRawUnsafe = vi.fn(async () => [{ id: 'x', blob: 'y'.repeat(6 * 1024 * 1024) }]); // 26 tables × ~6MB > 25MB cap

    const res = await request(app).post('/api/backups/create').set('Authorization', `Bearer ${devToken()}`);

    expect(res.status).toBe(413);
    expect(res.body.error).toContain('too large');
    expect(prismaMock.setting.upsert).not.toHaveBeenCalled();
  });

  it('download returns the full backup payload', async () => {
    prismaMock.setting.findUnique.mockResolvedValue({
      key: 'database_backups',
      value: [{ id: 'backup-1', createdAt: 'now', data: { users: [{ id: 1 }] } }],
    });
    const res = await request(app).get('/api/backups/backup-1/download').set('Authorization', `Bearer ${devToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.data.users).toHaveLength(1);
  });
});
