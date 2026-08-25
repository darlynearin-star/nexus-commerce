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

import { recoverStuckAdRenders } from '../utils/ad-render';

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.adVideo.findMany.mockResolvedValue([]);
});

describe('M-sigterm: stuck ad-render recovery', () => {
  it('requeues RENDERING rows and re-runs each job', async () => {
    prismaMock.adVideo.findMany.mockResolvedValue([{ id: 'ad_1' }, { id: 'ad_2' }]);
    prismaMock.adVideo.updateMany.mockResolvedValue({ count: 2 });
    const runner = vi.fn(async () => {});

    const n = await recoverStuckAdRenders(runner);

    expect(n).toBe(2);
    expect(prismaMock.adVideo.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'RENDERING' }, data: { status: 'QUEUED' } }),
    );
    await new Promise(r => setImmediate(r));
    expect(runner).toHaveBeenCalledWith('ad_1');
    expect(runner).toHaveBeenCalledWith('ad_2');
  });

  it('returns 0 when nothing is stuck', async () => {
    const runner = vi.fn(async () => {});
    const n = await recoverStuckAdRenders(runner);
    expect(n).toBe(0);
    expect(prismaMock.adVideo.updateMany).not.toHaveBeenCalled();
    expect(runner).not.toHaveBeenCalled();
  });

  it('a recovery failure is swallowed (boot must not break)', async () => {
    prismaMock.adVideo.findMany.mockRejectedValue(new Error('db gone'));
    const n = await recoverStuckAdRenders(vi.fn(async () => {}));
    expect(n).toBe(0);
  });
});
