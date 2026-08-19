import { describe, it, expect, beforeEach, vi } from 'vitest';

// Proxy-based prisma mock (same pattern as security.test.ts): model access
// returns fresh vi.fn()s; tests override specific calls.
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

beforeEach(() => {
  vi.clearAllMocks();
});

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY);
const daysAhead = (d: number) => new Date(Date.now() + d * DAY);

function baseSub(overrides: any = {}) {
  return {
    id: 'sub_1',
    retailerId: 'ret_1',
    status: 'TRIAL',
    trialStart: daysAgo(14),
    trialEnd: daysAgo(1),
    nextBillingDate: null,
    graceNotifiedAt: null,
    suspendedAt: null,
    retailer: {
      storeName: 'Adorn',
      storeSlug: 'adorn',
      user: { id: 'user_1', email: 'owner@test.com', firstName: 'A', lastName: 'B' },
    },
    ...overrides,
  };
}

describe('runSubscriptionEnforcement', () => {
  it('sends a grace notice for a lapsed trial and records the grace start', async () => {
    prismaMock.setting.findUnique.mockResolvedValue({ value: '3' });
    prismaMock.retailerSubscription.findMany.mockResolvedValue([baseSub()]);

    const result = await runSubscriptionEnforcement();

    expect(result.notice).toBe(1);
    expect(result.suspended).toBe(0);
    expect(prismaMock.retailerSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub_1' }, data: expect.objectContaining({ graceNotifiedAt: expect.any(Date) }) }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalled();
    expect(prismaMock.store.updateMany).not.toHaveBeenCalled();
  });

  it('does not resend the grace notice on subsequent runs', async () => {
    prismaMock.setting.findUnique.mockResolvedValue({ value: '3' });
    prismaMock.retailerSubscription.findMany.mockResolvedValue([baseSub({ graceNotifiedAt: daysAgo(1) })]);

    const result = await runSubscriptionEnforcement();

    expect(result.notice).toBe(0);
    expect(result.suspended).toBe(0);
    expect(prismaMock.retailerSubscription.update).not.toHaveBeenCalled();
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it('suspends the store and subscription once the grace period elapses', async () => {
    prismaMock.setting.findUnique.mockResolvedValue({ value: '3' });
    prismaMock.retailerSubscription.findMany.mockResolvedValue([baseSub({ graceNotifiedAt: daysAgo(4) })]);

    const result = await runSubscriptionEnforcement();

    expect(result.notice).toBe(0);
    expect(result.suspended).toBe(1);
    expect(prismaMock.store.updateMany).toHaveBeenCalledWith({ where: { slug: 'adorn' }, data: { isActive: false } });
    expect(prismaMock.retailerSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'sub_1' }, data: expect.objectContaining({ status: 'SUSPENDED', suspendedAt: expect.any(Date) }) }),
    );
    expect(prismaMock.notification.create).toHaveBeenCalled();
  });

  it('treats an ACTIVE subscription past its billing date as expired', async () => {
    prismaMock.setting.findUnique.mockResolvedValue({ value: '3' });
    prismaMock.retailerSubscription.findMany.mockResolvedValue([
      baseSub({ status: 'ACTIVE', trialEnd: daysAhead(10), nextBillingDate: daysAgo(2) }),
    ]);

    const result = await runSubscriptionEnforcement();

    expect(result.notice).toBe(1);
    expect(result.suspended).toBe(0);
  });

  it('uses the default grace period (3 days) when no setting is configured', async () => {
    prismaMock.setting.findUnique.mockResolvedValue(undefined);
    prismaMock.retailerSubscription.findMany.mockResolvedValue([baseSub({ graceNotifiedAt: daysAgo(3) })]);

    const result = await runSubscriptionEnforcement();

    expect(result.suspended).toBe(1);
  });

  it('ignores subscriptions that are not lapsed', async () => {
    prismaMock.setting.findUnique.mockResolvedValue({ value: '3' });
    prismaMock.retailerSubscription.findMany.mockResolvedValue([]);

    const result = await runSubscriptionEnforcement();

    expect(result.notice).toBe(0);
    expect(result.suspended).toBe(0);
    expect(prismaMock.retailerSubscription.update).not.toHaveBeenCalled();
  });
});