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

vi.mock('../utils/cache', () => ({
  cacheInvalidateStore: vi.fn(),
}));

import { clearUserCache } from '../middleware/auth';
import { createApp } from '../index';

const app = createApp();
const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';

const baseReview = {
  id: 'r1',
  storeId: 'store_1',
  productId: 'p1',
  customerId: 'c1',
  rating: 5,
  title: 'Great',
  content: 'Works well',
  images: [],
  isVerifiedPurchase: true,
  isApproved: false,
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u_ret', role: 'RETAILER', isActive: true });
  prismaMock.store.findUnique.mockResolvedValue({ id: 'store_1', slug: 'myshop', isActive: true, ownerId: 'u_ret', settings: [], theme: null });
});

function ownerToken(): string {
  return jwt.sign({ userId: 'u_ret', email: 'r@example.com', role: 'RETAILER' }, JWT_SECRET, { expiresIn: '2h' });
}

function customerToken(): string {
  return jwt.sign({ userId: 'u_cust', email: 'c@example.com', role: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '2h' });
}

describe('review moderation', () => {
  it('reviews are created unapproved (never public until moderated)', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'c1', userId: 'u_cust' });
    prismaMock.orderItem.findFirst.mockResolvedValue(null);
    prismaMock.review.create.mockResolvedValue({ ...baseReview, isApproved: false });

    const res = await request(app)
      .post('/api/reviews')
      .set('x-store-slug', 'myshop')
      .set('Authorization', `Bearer ${customerToken()}`)
      .send({ productId: 'p1', rating: 5, title: 'Great', content: 'Works well' });

    expect(res.status).toBe(201);
    const args = prismaMock.review.create.mock.calls[0][0].data;
    expect(args.isApproved).toBe(false);
    expect(res.body.data.isApproved).toBe(false);
  });

  it('owner can list pending reviews to moderate', async () => {
    prismaMock.review.findMany.mockResolvedValue([baseReview]);

    const res = await request(app)
      .get('/api/reviews?status=pending')
      .set('x-store-slug', 'myshop')
      .set('Authorization', `Bearer ${ownerToken()}`);

    expect(res.status).toBe(200);
    const where = prismaMock.review.findMany.mock.calls[0][0].where;
    expect(where.storeId).toBe('store_1');
    expect(where.isApproved).toBe(false);
    expect(res.body.data).toHaveLength(1);
  });

  it('owner can approve a review', async () => {
    prismaMock.review.findFirst.mockResolvedValue(baseReview);
    prismaMock.review.update.mockResolvedValue({ ...baseReview, isApproved: true });

    const res = await request(app)
      .put('/api/reviews/r1/approve')
      .set('x-store-slug', 'myshop')
      .set('Authorization', `Bearer ${ownerToken()}`);

    expect(res.status).toBe(200);
    const args = prismaMock.review.update.mock.calls[0][0];
    expect(args.where.id).toBe('r1');
    expect(args.data.isApproved).toBe(true);
    expect(res.body.data.isApproved).toBe(true);
  });

  it('review can be deleted by its owner', async () => {
    prismaMock.review.findFirst.mockResolvedValue(baseReview);
    prismaMock.review.delete.mockResolvedValue(baseReview);

    const res = await request(app)
      .delete('/api/reviews/r1')
      .set('x-store-slug', 'myshop')
      .set('Authorization', `Bearer ${ownerToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Review deleted');
  });

  it('store owner elsewhere cannot list, approve, or delete reviews', async () => {
    prismaMock.store.findUnique.mockResolvedValue({ id: 'store_2', slug: 'other', isActive: true, ownerId: 'someone_else', settings: [], theme: null });

    const list = await request(app).get('/api/reviews').set('x-store-slug', 'other').set('Authorization', `Bearer ${ownerToken()}`);
    const approve = await request(app).put('/api/reviews/r1/approve').set('x-store-slug', 'other').set('Authorization', `Bearer ${ownerToken()}`);
    const del = await request(app).delete('/api/reviews/r1').set('x-store-slug', 'other').set('Authorization', `Bearer ${ownerToken()}`);

    expect(list.status).toBe(403);
    expect(approve.status).toBe(403);
    expect(del.status).toBe(403);
    expect(prismaMock.review.findMany).not.toHaveBeenCalled();
    expect(prismaMock.review.findFirst).not.toHaveBeenCalled();
  });

  it('unauthenticated requests are rejected', async () => {
    const res = await request(app).put('/api/reviews/r1/approve').set('x-store-slug', 'myshop');
    expect(res.status).toBe(401);
  });
});