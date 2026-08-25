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

import { runSubscriptionEnforcement } from '../jobs/subscription-enforcer';

function lapsed(overrides: Partial<any> = {}, user: any | null = { id: 'u_1', email: 'a@x.com' }) {
  return {
    id: 'sub_1',
    status: 'TRIAL',
    trialEnd: new Date(Date.now() - 10 * 864e5),
    graceNotifiedAt: null,
    retailer: user ? { storeName: 'Shop', storeSlug: 'shop', user } : { storeName: 'Shop', storeSlug: 'shop', user: null },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks does NOT clear once-queues/rejected implementations —
  // reset the mocks these tests deliberately break, then restore health.
  prismaMock.notification.create.mockReset().mockResolvedValue({ id: 'n' });
  prismaMock.setting.findUnique.mockResolvedValue(null); // default grace days
  prismaMock.retailerSubscription.findMany.mockResolvedValue([]);
});

describe('H1: one failing subscription must not abort the enforcement sweep', () => {
  it('continues processing later subscriptions when an early one throws', async () => {
    prismaMock.retailerSubscription.findMany.mockResolvedValue([
      lapsed({ id: 'sub_BAD' }),
      lapsed({ id: 'sub_GOOD', graceNotifiedAt: new Date(Date.now() - 10 * 864e5) }), // suspension path
    ]);
    // First notification.create (grace notice for sub_BAD) explodes.
    prismaMock.notification.create.mockRejectedValueOnce(new Error('fk boom'));
    prismaMock.retailerSubscription.update.mockResolvedValue({ id: 'x' });

    const result = await runSubscriptionEnforcement();

    expect(result.errors).toBe(1);
    // The GOOD subscription was still processed to suspension.
    expect(result.suspended).toBe(1);
    expect(prismaMock.store.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isActive: false }) }),
    );
  });

  it('a notification failure after suspension still leaves the suspension committed and is counted', async () => {
    prismaMock.retailerSubscription.findMany.mockResolvedValue([
      lapsed({ graceNotifiedAt: new Date(Date.now() - 10 * 864e5) }),
    ]);
    prismaMock.notification.create.mockRejectedValue(new Error('fk boom'));

    const result = await runSubscriptionEnforcement();

    // Suspension writes happened before the throw — they stand.
    expect(prismaMock.retailerSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SUSPENDED' }) }),
    );
    expect(prismaMock.store.updateMany).toHaveBeenCalled();
    expect(result.errors).toBe(1);
    // The suspension DID happen (counted) and the error is isolated — no propagation.
    expect(result.suspended).toBe(1);
  });

  it('missing retailer user falls back to the system actor (valid FK) instead of throwing', async () => {
    prismaMock.retailerSubscription.findMany.mockResolvedValue([lapsed({}, null)]);
    prismaMock.retailerSubscription.update.mockResolvedValue({ id: 'sub_1' });

    const result = await runSubscriptionEnforcement();

    expect(result.notice).toBe(1);
    expect(result.errors).toBe(0);
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'system' }) }),
    );
  });

  it('clean sweep reports zero errors', async () => {
    prismaMock.retailerSubscription.findMany.mockResolvedValue([lapsed()]);
    prismaMock.retailerSubscription.update.mockResolvedValue({ id: 'sub_1' });

    const result = await runSubscriptionEnforcement();

    expect(result).toEqual({ notice: 1, suspended: 0, errors: 0 });
  });
});
