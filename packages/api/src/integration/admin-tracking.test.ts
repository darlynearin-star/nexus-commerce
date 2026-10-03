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

vi.mock('../utils/email', async () => {
  const actual = await vi.importActual<typeof import('../utils/email')>('../utils/email');
  return { ...actual, sendEmail: vi.fn().mockResolvedValue({ success: true, message: 'mocked send' }) };
});

import { clearUserCache } from '../middleware/auth';
import { createApp } from '../index';

const app = createApp();

const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';
const tokenFor = (payload: { userId: string; email: string; role: string }) => jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });

beforeEach(() => {
  clearUserCache();
  vi.clearAllMocks();
});

const retailerUser = {
  id: 'u1', email: 'josephine@example.com', firstName: 'Josephine', lastName: 'Ssenyams',
  role: 'RETAILER', isActive: true, twoFactorEnabled: false,
  createdAt: new Date('2025-01-01'), googleId: 'g1',
  customer: null,
};

describe('GET /api/admin/users/:id/tracking', () => {
  it('returns tracking data for a retailer with a store', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'dev1') return Promise.resolve({ id: 'dev1', role: 'SUPER_DEVELOPER', isActive: true });
      return Promise.resolve(retailerUser);
    });
    prismaMock.session.count.mockResolvedValue(4);
    prismaMock.session.findFirst.mockResolvedValue({
      id: 's1', lastActivity: new Date('2025-06-01'), ipAddress: '196.11.0.1', userAgent: 'Mozilla', createdAt: new Date('2025-01-02'),
    });
    prismaMock.activityLog.count.mockResolvedValue(12);
    prismaMock.activityLog.findMany.mockResolvedValue([
      { id: 'a1', action: 'user:login', resource: 'auth', resourceId: '', details: {}, ipAddress: '196.11.0.1', createdAt: new Date('2025-06-01') },
    ]);
    prismaMock.activityLog.groupBy.mockResolvedValue([{ action: 'user:login', _count: 3 }]);
    prismaMock.analyticsEvent.findMany.mockResolvedValue([
      { id: 'e1', eventType: 'PAGE_VIEW', pageUrl: '/store/jushang-entebbe', sessionId: 'sess1', createdAt: new Date('2025-06-01') },
    ]);
    prismaMock.analyticsEvent.count.mockResolvedValue(7);
    prismaMock.store.findFirst.mockResolvedValue({
      id: 'st1', name: 'Jushang - Entebbe', slug: 'jushang-entebbe', isActive: true, createdAt: new Date('2025-01-05'),
      _count: { products: 16 },
    });
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: 1500000 }, _count: 9 });
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o1', orderNumber: 'ORD-001', total: 195000, status: 'DELIVERED', paymentStatus: 'PAID', guestEmail: '', createdAt: new Date('2025-05-10') },
    ]);

    const res = await request(app)
      .get('/api/admin/users/u1/tracking')
      .set('Authorization', `Bearer ${tokenFor({ userId: 'dev1', email: 'dev@example.com', role: 'SUPER_DEVELOPER' })}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('josephine@example.com');
    expect(res.body.data.user.googleLinked).toBe(true);
    expect(res.body.data.sessions.active).toBe(4);
    expect(res.body.data.sessions.total).toBe(4);
    expect(res.body.data.activity.total).toBe(12);
    expect(res.body.data.activity.recent).toHaveLength(1);
    expect(res.body.data.analytics.total).toBe(7);
    expect(res.body.data.store.slug).toBe('jushang-entebbe');
    expect(res.body.data.storeOrders.count).toBe(9);
    expect(res.body.data.storeOrders.revenue).toBe(1500000);
    expect(res.body.data.customerOrders).toBeNull();
  });

  it('returns customer purchase stats when user is a customer', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'dev1') return Promise.resolve({ id: 'dev1', role: 'SUPER_DEVELOPER', isActive: true });
      return Promise.resolve({
        id: 'u2', email: 'buyer@example.com', firstName: 'Buy', lastName: 'Er',
        role: 'CUSTOMER', isActive: true, twoFactorEnabled: false,
        createdAt: new Date('2025-02-01'), googleId: null,
        customer: { id: 'c1' },
      });
    });
    prismaMock.session.count.mockResolvedValue(0);
    prismaMock.session.findFirst.mockResolvedValue(null);
    prismaMock.activityLog.count.mockResolvedValue(0);
    prismaMock.activityLog.findMany.mockResolvedValue([]);
    prismaMock.activityLog.groupBy.mockResolvedValue([]);
    prismaMock.analyticsEvent.findMany.mockResolvedValue([]);
    prismaMock.analyticsEvent.count.mockResolvedValue(0);
    prismaMock.store.findFirst.mockResolvedValue(null);
    prismaMock.order.aggregate.mockResolvedValue({ _sum: { total: 250000 }, _count: 2 });
    prismaMock.order.findMany.mockResolvedValue([
      { id: 'o2', orderNumber: 'ORD-002', total: 100000, status: 'COMPLETED', paymentStatus: 'PAID', store: { name: 'Adorn', slug: 'adorn' }, createdAt: new Date('2025-04-01') },
    ]);

    const res = await request(app)
      .get('/api/admin/users/u2/tracking')
      .set('Authorization', `Bearer ${tokenFor({ userId: 'dev1', email: 'dev@example.com', role: 'SUPER_DEVELOPER' })}`)
      .expect(200);

    expect(res.body.data.store).toBeNull();
    expect(res.body.data.customerOrders.count).toBe(2);
    expect(res.body.data.customerOrders.spent).toBe(250000);
  });

  it('returns 404 for unknown user', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'dev1') return Promise.resolve({ id: 'dev1', role: 'SUPER_DEVELOPER', isActive: true });
      return Promise.resolve(null);
    });
    const res = await request(app)
      .get('/api/admin/users/nope/tracking')
      .set('Authorization', `Bearer ${tokenFor({ userId: 'dev1', email: 'dev@example.com', role: 'SUPER_DEVELOPER' })}`)
      .expect(404);
    expect(res.body.success).toBe(false);
  });

  it('rejects non-permitted roles', async () => {
    prismaMock.user.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === 'c1') return Promise.resolve({ id: 'c1', role: 'CUSTOMER', isActive: true });
      return Promise.resolve(retailerUser);
    });
    const res = await request(app)
      .get('/api/admin/users/u1/tracking')
      .set('Authorization', `Bearer ${tokenFor({ userId: 'c1', email: 'c@example.com', role: 'CUSTOMER' })}`)
      .expect(403);
    expect(res.body.success).toBe(false);
  });
});
