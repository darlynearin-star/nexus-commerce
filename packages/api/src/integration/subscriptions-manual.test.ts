import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Build a Proxy-based prisma mock: any model method access returns a fresh
// vi.fn() (resolving undefined by default). Tests override specific calls.
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

function tokenFor(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

const retailerUser = { id: 'u_ret', role: 'RETAILER', isActive: true };
const retailer = { id: 'ret_1', userId: 'u_ret', storeSlug: 'myshop', subscription: null };

const MOMO_SETTINGS = [
  { value: '7180236' },
  { value: '740157510' },
  { value: 'JOSEPHINE - Lyn-nyx stores' },
];

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
});

describe('manual mobile-money subscription flow', () => {
  it('subscribe with mobile_money returns pay instructions and stores a PENDING payment', async () => {
    prismaMock.user.findUnique.mockResolvedValue(retailerUser);
    prismaMock.retailer.findUnique.mockResolvedValue(retailer);
    prismaMock.setting.findUnique.mockResolvedValueOnce(MOMO_SETTINGS[0]).mockResolvedValueOnce(MOMO_SETTINGS[1]).mockResolvedValueOnce(MOMO_SETTINGS[2]);
    prismaMock.retailerSubscription.upsert.mockResolvedValue({ id: 'sub_1', weeklyAmount: 7000, currency: 'UGX' });
    prismaMock.subscriptionPayment.create.mockResolvedValue({ id: 'pay_1', status: 'PENDING' });

    const token = tokenFor({ userId: 'u_ret', email: 'retailer@example.com', role: 'RETAILER' });
    const res = await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'mobile_money' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payment.id).toBe('pay_1');
    expect(res.body.payment.instructions.merchantCode).toBe('7180236');
    expect(res.body.payment.instructions.number).toBe('740157510');
    expect(res.body.payment.instructions.accountName).toBe('JOSEPHINE - Lyn-nyx stores');
    expect(res.body.payment.instructions.amount).toBe(7000);
    expect(prismaMock.subscriptionPayment.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ method: 'mobile_money', status: 'PENDING', transactionId: expect.stringContaining('SUB-') }) }),
    );
  });

  it('manual charge fails cleanly when collection details are not configured', async () => {
    prismaMock.user.findUnique.mockResolvedValue(retailerUser);
    prismaMock.retailer.findUnique.mockResolvedValue(retailer);
    prismaMock.setting.findUnique.mockResolvedValue(null);
    prismaMock.retailerSubscription.upsert.mockResolvedValue({ id: 'sub_1', weeklyAmount: 7000, currency: 'UGX' });

    const token = tokenFor({ userId: 'u_ret', email: 'retailer@example.com', role: 'RETAILER' });
    const res = await request(app)
      .post('/api/subscriptions/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ method: 'mobile_money' });

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not configured');
    expect(prismaMock.subscriptionPayment.create).not.toHaveBeenCalled();
  });

  it('retailer can report a payment for confirmation', async () => {
    prismaMock.user.findUnique.mockResolvedValue(retailerUser);
    prismaMock.subscriptionPayment.findFirst.mockResolvedValue({ id: 'pay_1', status: 'PENDING', subscriptionId: 'sub_1' });
    prismaMock.subscriptionPayment.update.mockResolvedValue({ id: 'pay_1', status: 'PENDING', customerNote: 'Paid from Airtel Money, ref 884120' });

    const token = tokenFor({ userId: 'u_ret', email: 'retailer@example.com', role: 'RETAILER' });
    const res = await request(app)
      .post('/api/subscriptions/report-paid')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId: 'pay_1', note: 'Paid from Airtel Money, ref 884120' });

    expect(res.status).toBe(200);
    expect(prismaMock.subscriptionPayment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ customerNote: 'Paid from Airtel Money, ref 884120' }) }),
    );
    expect(res.body.message).toContain('Waiting for confirmation');
  });

  it('owner confirms a manual payment and reactivates the subscription + store', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_dev', role: 'SUPER_DEVELOPER', isActive: true });
    prismaMock.subscriptionPayment.findUnique.mockResolvedValue({ id: 'pay_1', status: 'PENDING', subscriptionId: 'sub_1', method: 'mobile_money' });
    prismaMock.subscriptionPayment.update.mockResolvedValue({ id: 'pay_1', status: 'PAID' });
    prismaMock.retailerSubscription.update.mockResolvedValue({ id: 'sub_1', status: 'ACTIVE' });
    prismaMock.retailerSubscription.findUnique.mockResolvedValue({ id: 'sub_1', retailer: { storeSlug: 'myshop' } });
    prismaMock.store.updateMany.mockResolvedValue({ count: 1 });

    const token = tokenFor({ userId: 'u_dev', email: 'dev@example.com', role: 'SUPER_DEVELOPER' });
    const res = await request(app)
      .post('/api/subscriptions/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId: 'pay_1' });

    expect(res.status).toBe(200);
    expect(prismaMock.subscriptionPayment.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }));
    expect(prismaMock.retailerSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE', suspendedAt: null }) }),
    );
    expect(prismaMock.store.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isActive: true }) }));
  });

  it('rejects a RETAILER who tries to confirm a payment (owner-only)', async () => {
    prismaMock.user.findUnique.mockResolvedValue(retailerUser);

    const token = tokenFor({ userId: 'u_ret', email: 'retailer@example.com', role: 'RETAILER' });
    const res = await request(app)
      .post('/api/subscriptions/confirm')
      .set('Authorization', `Bearer ${token}`)
      .send({ paymentId: 'pay_1' });

    expect(res.status).toBe(403);
    expect(prismaMock.subscriptionPayment.findUnique).not.toHaveBeenCalled();
  });
});