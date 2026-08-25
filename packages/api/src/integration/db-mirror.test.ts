import { describe, it, expect, beforeEach, vi } from 'vitest';

// Must be set before the module under test is imported (getFallbackClient
// reads it lazily now, but the client caches after first use).
vi.hoisted(() => {
  process.env.DATABASE_URL_FALLBACK = 'postgresql://fallback-test';
});

vi.mock('@nexus/database', () => ({
  default: {},
  initDatabase: vi.fn(),
  getDbStatus: vi.fn(() => ({ usingFallback: false })),
  PrismaClient: class PrismaClientMock {
    setting = {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async ({ update, create }: any) => ({ value: update?.value ?? create?.value })),
    };
  },
}));

import { computeDigest, mirrorToFallbackIfChanged, restoreFallbackIfEmpty, getFallbackClient } from '../utils/db-mirror';
import type { PrismaClient } from '@nexus/database';

/** Minimal fake prisma focused on the raw-SQL surface db-mirror uses. */
function fakePrisma(opts: {
  counts?: Record<string, number>;
  changes?: Record<string, number>;
  storedMirror?: any;
  usersCount?: number;
  failOnTable?: string;
} = {}) {
  const executed: string[] = [];
  const txExecuted: string[] = [];
  let txThrew = false;
  const p = {
    $queryRawUnsafe: vi.fn(async (sql: string) => {
      if (sql.includes('pg_stat_user_tables')) {
        return Object.entries(opts.changes || {}).map(([tbl, n]) => ({ tbl, n_tup_ins: 0, n_tup_upd: n, n_tup_del: 0 }));
      }
      if (sql.includes('FROM "users"')) { const n = opts.counts?.users ?? opts.usersCount ?? 0; return [{ c: n, count: n }]; }
      const m = sql.match(/FROM "([a-z_]+)"/);
      return [{ c: opts.counts?.[m?.[1] || ''] ?? 0 }];
    }),
    setting: {
      findUnique: vi.fn(async ({ where: { key } }: any) =>
        key === 'fallback_mirror' && opts.storedMirror ? { key, value: opts.storedMirror } : null),
      upsert: vi.fn(async ({ where: { key }, update, create }: any) => ({ key, value: update?.value ?? create?.value })),
    },
    $transaction: vi.fn(async (fn: any) => {
      const tx = {
        $executeRawUnsafe: vi.fn(async (sql: string) => {
          txExecuted.push(sql);
          if (opts.failOnTable && sql.includes(`"${opts.failOnTable}"`)) {
            txThrew = true;
            throw new Error(`insert failed: ${opts.failOnTable}`);
          }
          return 1;
        }),
      };
      await fn(tx);
      return null;
    }),
    $executeRawUnsafe: vi.fn(async (sql: string) => { executed.push(sql); return 1; }),
    __executed: executed,
    __txExecuted: txExecuted,
    __txThrew: () => txThrew,
  };
  return p as unknown as PrismaClient & Record<string, any>;
}

const MIRROR_TABLES_SAMPLE = { users: 'INSERT INTO "users" VALUES (1);', stores: 'INSERT INTO "stores" VALUES (1);' };

/** Configure the cached fallback client's stored mirror snapshot. */
function setStoredMirror(stored: any) {
  const fb = getFallbackClient() as any;
  fb.setting.findUnique.mockImplementation(async () => (stored ? { key: 'fallback_mirror', value: stored } : null));
  return fb;
}

describe('H7: mirror digest sees UPDATEs, not just row counts', () => {
  it('computeDigest returns per-table counts', async () => {
    const p = fakePrisma({ counts: { users: 5, stores: 2 } });
    const digest = await computeDigest(p);
    expect(digest.users).toBe(5);
    expect(digest.stores).toBe(2);
  });

  it('skips the mirror when counts AND change counters are unchanged', async () => {
    const counts = { users: 1, stores: 1 };
    const changes = { users: 10, stores: 3 };
    const p = fakePrisma({ counts, changes });
    // Stored snapshot must carry the FULL computed digest (all tables), like production.
    const digest = await computeDigest(p);
    setStoredMirror({ createdAt: 'x', tables: {}, digest, changes });
    const r1 = await mirrorToFallbackIfChanged(p);
    expect(r1.skipped).toBe(true);
    expect(r1.mirrored).toBe(false);
    const fb = getFallbackClient() as any;
    expect(fb.setting.upsert).not.toHaveBeenCalled();
  });

  it('RE-MIRRORS when only an UPDATE happened (counts identical, tup_upd moved) — the H7 fix', async () => {
    const counts = { users: 1, stores: 1 };
    const p = fakePrisma({ counts, changes: { users: 11, stores: 3 } });
    const digest = await computeDigest(p);
    setStoredMirror({ createdAt: 'x', tables: {}, digest, changes: { users: 10, stores: 3 } });
    const r = await mirrorToFallbackIfChanged(p);
    expect(r.mirrored).toBe(true);
    const fb = getFallbackClient() as any;
    expect(fb.setting.upsert).toHaveBeenCalled();
  });

  it('legacy snapshots (no changes key) are treated as changed → re-mirrored', async () => {
    const counts = { users: 1 };
    setStoredMirror({ createdAt: 'x', tables: {}, digest: counts });
    const p = fakePrisma({ counts, changes: { users: 1 } });
    const r = await mirrorToFallbackIfChanged(p);
    expect(r.mirrored).toBe(true);
  });
});

describe('H7: restore is atomic and pool-safe', () => {
  it('restores inside ONE transaction with SET LOCAL (auto-reverting FK disable)', async () => {
    const p = fakePrisma({ usersCount: 0, storedMirror: { tables: MIRROR_TABLES_SAMPLE } });
    const r = await restoreFallbackIfEmpty(p);

    expect(r.restored).toBe(true);
    expect(p.$transaction).toHaveBeenCalledTimes(1);
    const txExec = p.__txExecuted as string[];
    expect(txExec[0]).toContain('SET LOCAL session_replication_role = replica');
    expect(txExec.some(s => s.includes('INSERT INTO "users"'))).toBe(true);
    // No session-scoped SET outside the transaction (pool poisoning guard).
    expect((p.__executed as string[]).some(s => s.includes('session_replication_role'))).toBe(false);
  });

  it('a mid-restore failure aborts the transaction (no half-restored DB)', async () => {
    const p = fakePrisma({ usersCount: 0, storedMirror: { tables: { ...MIRROR_TABLES_SAMPLE, orders: 'INSERT INTO "orders" VALUES (1);' } }, failOnTable: 'orders' });

    await expect(restoreFallbackIfEmpty(p)).rejects.toThrow('insert failed: orders');
    expect(p.__txThrew()).toBe(true);
  });

  it('skips when the target already has data', async () => {
    const p = fakePrisma({ usersCount: 3, storedMirror: { tables: MIRROR_TABLES_SAMPLE } });
    const r = await restoreFallbackIfEmpty(p);
    expect(r.skipped).toBe(true);
    expect(p.$transaction).not.toHaveBeenCalled();
  });
});
