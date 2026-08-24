import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Proxy-based prisma mock (repo-standard pattern).
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

// Interactive-transaction shim: run the callback against the same mock so we
// can assert the exact write sequence that would be atomic in production.
function useTx() {
  prismaMock.$transaction = vi.fn(async (fn: any) => fn(prismaMock));
}

function activationMocks() {
  prismaMock.retailerSubscription.update.mockResolvedValue({ id: 'sub_1', status: 'ACTIVE' });
  prismaMock.retailerSubscription.findUnique.mockResolvedValue({ id: 'sub_1', retailer: { storeSlug: 'myshop' } });
  prismaMock.store.updateMany.mockResolvedValue({ count: 1 });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u_dev', role: 'SUPER_DEVELOPER', isActive: true });
});

describe('C4: a replayed payment event grants no additional entitlement', () => {
  it('manual /confirm applies exactly once: CAS claim + activation inside one transaction', async () => {
    useTx();
    activationMocks();
    prismaMock.subscriptionPayment.findUnique.mockResolvedValue({ id: 'pay_1', status: 'PENDING', subscriptionId: 'sub_1', method: 'mobile_money' });
    prismaMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });

    const res = await request(app)
      .post('/api/subscriptions/confirm')
      .set('Authorization', `Bearer ${devToken()}`)
      .send({ paymentId: 'pay_1' });

    expect(res.status).toBe(200);
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscriptionPayment.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.retailerSubscription.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.store.updateMany).toHaveBeenCalledTimes(1);
  });

  it('concurrent duplicate confirm: the loser claims 0 rows and must NOT re-activate', async () => {
    useTx();
    activationMocks();
    prismaMock.subscriptionPayment.findUnique.mockResolvedValue({ id: 'pay_1', status: 'PENDING', subscriptionId: 'sub_1', method: 'mobile_money' });
    // Winner already flipped status to PAID before the loser's CAS ran.
    prismaMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/subscriptions/confirm')
      .set('Authorization', `Bearer ${devToken()}`)
      .send({ paymentId: 'pay_1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Already paid');
    expect(prismaMock.retailerSubscription.update).not.toHaveBeenCalled();
    expect(prismaMock.store.updateMany).not.toHaveBeenCalled();
  });

  it('confirm after already-PAID: short-circuits before any write', async () => {
    prismaMock.subscriptionPayment.findUnique.mockResolvedValue({ id: 'pay_1', status: 'PAID', subscriptionId: 'sub_1', method: 'mobile_money' });

    const res = await request(app)
      .post('/api/subscriptions/confirm')
      .set('Authorization', `Bearer ${devToken()}`)
      .send({ paymentId: 'pay_1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Already paid');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.retailerSubscription.update).not.toHaveBeenCalled();
  });

  it('failure inside the transaction rejects the whole operation (no partial success response)', async () => {
    useTx();
    prismaMock.subscriptionPayment.findUnique.mockResolvedValue({ id: 'pay_1', status: 'PENDING', subscriptionId: 'sub_1', method: 'mobile_money' });
    prismaMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
    // Activation explodes mid-transaction — in production the tx rolls back.
    prismaMock.retailerSubscription.update.mockRejectedValue(new Error('db gone'));

    const res = await request(app)
      .post('/api/subscriptions/confirm')
      .set('Authorization', `Bearer ${devToken()}`)
      .send({ paymentId: 'pay_1' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

describe('C4: Flutterwave webhook subscription branch', () => {
  const SECRET = 'whsec_test';
  // Dashed-UUID subscription id — the old split('-')[1] parse truncated this.
  const SUB_ID = '550e8400-e29b-41d4-a716-446655440000';
  const TX_REF = `SUB-${SUB_ID}-1724000000000`;

  function webhookMock(payment: any) {
    prismaMock.setting.findUnique.mockResolvedValue({ key: 'FLUTTERWAVE_WEBHOOK_SECRET', value: SECRET });
    prismaMock.subscriptionPayment.findFirst.mockResolvedValue(payment);
    useTx();
    activationMocks();
    prismaMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 1 });
  }

  it('applies a valid webhook exactly once, with the FULL dashed subscription id', async () => {
    webhookMock({ id: 'pay_9', status: 'PENDING', subscriptionId: SUB_ID, transactionId: TX_REF });

    const res = await request(app)
      .post('/api/subscriptions/webhook/flutterwave')
      .set('verif-hash', SECRET)
      .send({ event: 'charge.completed', data: { status: 'successful', tx_ref: TX_REF, id: 987654 } });

    expect(res.status).toBe(200);
    // The parse fix: findFirst must have been queried with the complete UUID,
    // not the truncated '550e8400' the old split('-')[1] produced.
    expect(prismaMock.subscriptionPayment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { subscriptionId: SUB_ID, transactionId: TX_REF } }),
    );
    expect(prismaMock.subscriptionPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { not: 'PAID' } }) }),
    );
    expect(prismaMock.retailerSubscription.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.store.updateMany).toHaveBeenCalledTimes(1);
  });

  it('replayed webhook (CAS matches 0 rows) does not re-activate or extend billing', async () => {
    webhookMock({ id: 'pay_9', status: 'PENDING', subscriptionId: SUB_ID, transactionId: TX_REF });
    // The first webhook already claimed the payment: the conditional update
    // now matches 0 rows because status is PAID in the DB.
    prismaMock.subscriptionPayment.updateMany.mockResolvedValue({ count: 0 });

    const res = await request(app)
      .post('/api/subscriptions/webhook/flutterwave')
      .set('verif-hash', SECRET)
      .send({ event: 'charge.completed', data: { status: 'successful', tx_ref: TX_REF, id: 987654 } });

    expect(res.status).toBe(200);
    expect(prismaMock.subscriptionPayment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: { not: 'PAID' } }) }),
    );
    expect(prismaMock.retailerSubscription.update).not.toHaveBeenCalled();
    expect(prismaMock.store.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a webhook with a bad signature before touching anything', async () => {
    webhookMock(null);
    const res = await request(app)
      .post('/api/subscriptions/webhook/flutterwave')
      .set('verif-hash', 'wrong-secret')
      .send({ event: 'charge.completed', data: { status: 'successful', tx_ref: TX_REF } });
    expect(res.status).toBe(401);
    expect(prismaMock.subscriptionPayment.findFirst).not.toHaveBeenCalled();
  });
});
