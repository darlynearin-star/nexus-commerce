import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { signAccessToken } from '../utils/jwt';

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
const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET as string) || 'test-refresh-secret-for-unit-tests-0123456789';

function tokenFor(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '2h' });
}

const store = { id: 'store_1', slug: 'myshop', isActive: true, ownerId: 'owner_1', settings: [], theme: null };
// requireActiveSubscription (orders router) needs store.owner; a non-RETAILER
// owner bypasses the subscription checks entirely.
const subStore = { ...store, owner: { role: 'CUSTOMER' } };

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
});

describe('registration locks role to CUSTOMER (TASK-001)', () => {
  it('ignores a requested role and always creates CUSTOMER', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'u_1', email: 'buyer@example.com', firstName: 'Buy', lastName: 'Er', role: 'CUSTOMER', emailVerified: false });
    prismaMock.customer.create.mockResolvedValue({ id: 'c_1' });
    prismaMock.session.create.mockResolvedValue({ id: 's_1' });
    prismaMock.setting.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'buyer@example.com', password: 'StrongPass1', firstName: 'Buy', lastName: 'Er', role: 'DEVELOPER' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('CUSTOMER');
    // The create() call must have received role CUSTOMER, never the request body.
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'CUSTOMER' }) }),
    );
    expect(res.body.data.user.role).not.toBe('DEVELOPER');
  });
});

describe('role freshness comes from the DB, not the token (TASK-003)', () => {
  it('grants a DEVELOPER-only route when the DB role is DEVELOPER even if the token claims CUSTOMER', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_2', role: 'DEVELOPER', isActive: true });
    const token = tokenFor({ userId: 'u_2', email: 'dev@example.com', role: 'CUSTOMER' });

    const res = await request(app).get('/api/kill-switch').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('denies a DEVELOPER-only route when the DB role is CUSTOMER even if the token claims DEVELOPER', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_3', role: 'CUSTOMER', isActive: true });
    const token = tokenFor({ userId: 'u_3', email: 'customer@example.com', role: 'DEVELOPER' });

    const res = await request(app).get('/api/kill-switch').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('cart dedup endpoint was removed (TASK-004)', () => {
  it('returns 404 for POST /api/cart/dedup', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);

    const res = await request(app)
      .post('/api/cart/dedup')
      .set('x-store-slug', 'myshop')
      .set('x-session-id', 'sess_1')
      .send({});

    expect(res.status).toBe(404);
  });
});

describe('OAuth state cannot be forged (TASK-005)', () => {
  it('rejects an invalid state and redirects to google_state_invalid', async () => {
    const res = await request(app).get('/api/auth/google/callback').query({ code: 'abc', state: 'forged-state' }).redirects(0);

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('google_state_invalid');
  });

  it('accepts a correctly signed state (then fails at the code exchange, proving the guard passes)', async () => {
    const state = jwt.sign({ purpose: 'google-oauth', nonce: 'abc123' }, JWT_SECRET, { expiresIn: '10m' });
    const res = await request(app).get('/api/auth/google/callback').query({ code: 'some-code', state }).redirects(0);

    // Signed state passes the guard; without client creds the route 503s.
    expect([302, 503]).toContain(res.status);
    if (res.status === 302) {
      expect(res.headers.location).not.toContain('google_state_invalid');
    }
  });
});

describe('store ownership is enforced (TASK-007)', () => {
  it('forbids a non-owner from reading a product detail', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'intruder', role: 'RETAILER', isActive: true });
    const token = tokenFor({ userId: 'intruder', email: 'intruder@example.com', role: 'RETAILER' });

    const res = await request(app).get('/api/products/detail/p_1').set('x-store-slug', 'myshop').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(prismaMock.product.findFirst).not.toHaveBeenCalled();
  });

  it('allows the owner to read their product', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'owner_1', role: 'RETAILER', isActive: true });
    prismaMock.product.findFirst.mockResolvedValue({ id: 'p_1', name: 'Shoe', storeId: 'store_1' });
    const token = tokenFor({ userId: 'owner_1', email: 'owner@example.com', role: 'RETAILER' });

    const res = await request(app).get('/api/products/detail/p_1').set('x-store-slug', 'myshop').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('p_1');
  });
});

describe('cart add validates the product belongs to the store (TASK-013)', () => {
  it('rejects a product that belongs to a different store', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_4', role: 'CUSTOMER', isActive: true });
    // Product of another store: findFirst scoped to store_1 returns nothing.
    prismaMock.product.findFirst.mockResolvedValue(null);
    const token = tokenFor({ userId: 'u_4', email: 'customer@example.com', role: 'CUSTOMER' });

    const res = await request(app)
      .post('/api/cart/add')
      .set('x-store-slug', 'myshop')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'p_other_store', quantity: 1 });

    expect(res.status).toBe(404);
    expect(res.body.error).toContain('not found in this store');
    // The query must have been scoped to the resolved store.
    expect(prismaMock.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: 'store_1', id: 'p_other_store' }) }),
    );
  });
});

describe('coupon validation and discount math (TASK-012)', () => {
  it('rejects an expired coupon', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.coupon.findFirst.mockResolvedValue({
      id: 'c_1', code: 'EXPIRED', discountType: 'PERCENTAGE', discountValue: 10,
      minOrderAmount: 0, maxUses: 0, usedCount: 0, maxUsesPerCustomer: 0,
      isActive: true, startsAt: null, expiresAt: new Date(Date.now() - 1000), appliesTo: [],
    });

    const res = await request(app)
      .post('/api/cart/coupon')
      .set('x-store-slug', 'myshop')
      .set('x-session-id', 'sess_1')
      .send({ code: 'EXPIRED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('expired');
  });

  it('applies a valid PERCENTAGE coupon to the cart subtotal', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.coupon.findFirst.mockResolvedValue({
      id: 'c_2', code: 'SAVE10', discountType: 'PERCENTAGE', discountValue: 10,
      minOrderAmount: 0, maxUses: 0, usedCount: 0, maxUsesPerCustomer: 0,
      isActive: true, startsAt: null, expiresAt: new Date(Date.now() + 86_400_000), appliesTo: [],
    });
    prismaMock.cart.findFirst.mockResolvedValue({
      id: 'cart_1',
      items: [{ product: { price: 1000, id: 'p_1' }, quantity: 2 }],
    });
    prismaMock.cart.update.mockResolvedValue({ id: 'cart_1', couponCode: 'SAVE10', couponDiscount: 200 });
    prismaMock.coupon.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/cart/coupon')
      .set('x-store-slug', 'myshop')
      .set('x-session-id', 'sess_1')
      .send({ code: 'SAVE10' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // 10% of (1000 * 2) = 200
    expect(prismaMock.cart.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ couponDiscount: 200 }) }),
    );
  });

  it('rejects a coupon when the subtotal is below the minimum order amount', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.coupon.findFirst.mockResolvedValue({
      id: 'c_3', code: 'MIN500', discountType: 'FIXED_AMOUNT', discountValue: 50,
      minOrderAmount: 500, maxUses: 0, usedCount: 0, maxUsesPerCustomer: 0,
      isActive: true, startsAt: null, expiresAt: new Date(Date.now() + 86_400_000), appliesTo: [],
    });
    prismaMock.cart.findFirst.mockResolvedValue({
      id: 'cart_2',
      items: [{ product: { price: 100, id: 'p_1' }, quantity: 2 }], // subtotal 200 < 500
    });

    const res = await request(app)
      .post('/api/cart/coupon')
      .set('x-store-slug', 'myshop')
      .set('x-session-id', 'sess_1')
      .send({ code: 'MIN500' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('minimum order');
  });
});

describe('guest checkout (TASK-044)', () => {
  const cart = {
    id: 'cart_g1',
    couponCode: null,
    couponDiscount: 0,
    items: [{
      productId: 'p_1', variantId: null, quantity: 2,
      product: { id: 'p_1', name: 'T-Shirt', sku: 'TS-1', price: 1000, storeId: 'store_1', status: 'PUBLISHED' },
    }],
  };

  let txOrderCreate: any;

  function mockOrderFlow(orderId = 'order_g1') {
    const order = { id: orderId, orderNumber: 'NEXUS-ABC', subtotal: 2000, total: 2000, shippingCost: 0, storeId: 'store_1' };
    txOrderCreate = vi.fn().mockResolvedValue(order);
    // The prisma Proxy only wraps model access; $transaction/$queryRaw must be
    // assigned directly so they remain callable functions.
    (prismaMock as any).$transaction = vi.fn((fn: any) =>
      fn({
        order: { create: txOrderCreate },
        notification: { create: vi.fn().mockResolvedValue({}) },
        cartItem: { deleteMany: vi.fn().mockResolvedValue({}) },
      }),
    );
    (prismaMock as any).$queryRaw = vi.fn().mockResolvedValue([{ phone: '0700000000', whatsapp: '' }]);
  }

  it('requires no auth but does require contact email', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    const res = await request(app)
      .post('/api/orders')
      .set('x-store-slug', 'myshop')
      .set('x-session-id', 'sess_guest')
      .send({ customerPhone: '256700000000' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Email is required');
  });

  it('rejects when neither auth nor session id is present', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    const res = await request(app)
      .post('/api/orders')
      .set('x-store-slug', 'myshop')
      .send({ guestEmail: 'guest@example.com' });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('creates an order with guest details and no customer link', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.cart.findFirst.mockResolvedValue(cart);
    mockOrderFlow();

    const res = await request(app)
      .post('/api/orders')
      .set('x-store-slug', 'myshop')
      .set('x-session-id', 'sess_guest')
      .send({ guestEmail: 'guest@example.com', guestName: 'Jane Doe', customerPhone: '256700000000', shippingAddress: 'Kampala' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Guest cart lookup is scoped by session id, not customer id.
    expect(prismaMock.cart.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ sessionId: 'sess_guest', storeId: 'store_1' }) }),
    );
    const orderData = txOrderCreate.mock.calls[0][0].data;
    expect(orderData.customerId).toBeNull();
    expect(orderData.guestEmail).toBe('guest@example.com');
    expect(orderData.guestName).toBe('Jane Doe');
    expect(res.body.data.storePhone).toBe('0700000000');
  });

  it('guest can add to cart with only a session id', async () => {
    prismaMock.store.findUnique.mockResolvedValue(subStore);
    prismaMock.product.findFirst.mockResolvedValue({ id: 'p_1', price: 1000, status: 'PUBLISHED', stock: 5 });
    prismaMock.cart.findFirst.mockResolvedValue(null);
    prismaMock.cart.create.mockResolvedValue({ id: 'cart_new' });
    prismaMock.cartItem.findFirst.mockResolvedValue(null);
    prismaMock.cartItem.create.mockResolvedValue({ id: 'item_1' });
    prismaMock.cart.findUnique.mockResolvedValue({ id: 'cart_new', items: [] });

    const res = await request(app)
      .post('/api/cart/add')
      .set('x-store-slug', 'myshop')
      .set('x-session-id', 'sess_guest')
      .send({ productId: 'p_1', quantity: 1 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(prismaMock.cart.create).toHaveBeenCalledWith({
      data: { storeId: 'store_1', sessionId: 'sess_guest' },
    });
  });
});

describe('password reset self-service (TASK-047)', () => {
  beforeEach(() => {
    // isEmailConfigured() reads the RESEND keys from the settings table.
    prismaMock.setting.findUnique.mockImplementation(({ where }: any) =>
      where.key === 'RESEND_API_KEY'
        ? Promise.resolve({ value: 're_test' })
        : where.key === 'RESEND_FROM_EMAIL'
          ? Promise.resolve({ value: 'noreply@lynnyx.com' })
          : Promise.resolve(undefined),
    );
  });

  it('responds generically and creates a token + email when the user exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_1', email: 'reset@example.com', firstName: 'Res', lastName: 'et', role: 'CUSTOMER', passwordHash: 'old', isActive: true });
    prismaMock.passwordResetToken.create.mockResolvedValue({ id: 't_1' });

    const res = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'RESET@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('link has been sent');
    // Lookup normalizes to lowercase.
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'reset@example.com' } });
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'reset@example.com' }) }),
    );
  });

  it('does not disclose whether the account exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'ghost@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('link has been sent');
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('rejects a weak new password', async () => {
    const res = await request(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token: 'abc', email: 'reset@example.com', newPassword: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Password must');
  });

  it('rejects an expired, used, or mismatched token', async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 't_1', token: 'tok', email: 'reset@example.com', expiresAt: new Date(Date.now() - 1000), usedAt: null,
    });
    const res = await request(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token: 'tok', email: 'reset@example.com', newPassword: 'NewPass123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid or expired');
  });

  it('updates the password, marks the token used, and invalidates sessions', async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({
      id: 't_1', token: 'tok', email: 'reset@example.com', expiresAt: new Date(Date.now() + 86_400_000), usedAt: null,
    });
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_1', email: 'reset@example.com', isActive: true, passwordHash: 'old' });
    (prismaMock as any).$transaction = vi.fn(async (ops: any[]) => Promise.all(ops));

    const res = await request(app)
      .post('/api/auth/password-reset/confirm')
      .send({ token: 'tok', email: 'reset@example.com', newPassword: 'NewPass123' });

    expect(res.status).toBe(200);
    expect(prismaMock.passwordResetToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ usedAt: expect.any(Date) }) }),
    );
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ passwordHash: expect.stringMatching(/^\$2/) }) }),
    );
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u_1' }) }),
    );
  });
});

describe('store onboarding (TASK-045)', () => {
  it('creates a store with contact details and default settings', async () => {
    prismaMock.featureFlag.findUnique.mockResolvedValue({ key: 'storeCreation', enabled: true });
    prismaMock.store.count.mockResolvedValue(0);
    prismaMock.store.findUnique.mockResolvedValue(null); // slug free
    prismaMock.store.findFirst.mockResolvedValue(null); // no existing store
    prismaMock.store.create.mockResolvedValue({
      id: 'store_1', name: 'Adorn', slug: 'adorn2', ownerId: 'u_1',
      settings: { currency: 'UGX', location: 'Kampala, Uganda' }, theme: null,
    });
    prismaMock.retailer.upsert.mockResolvedValue({ userId: 'u_1' });
    const rawUpdates: string[] = [];
    (prismaMock as any).$executeRaw = vi.fn((s: TemplateStringsArray, ...args: any[]) => {
      rawUpdates.push(s.join('?'));
      return Promise.resolve(1);
    });
    (prismaMock as any).$queryRaw = vi.fn().mockResolvedValue([{ phone: '0700111222', whatsapp: '0700111222' }]);

    const token = tokenFor({ userId: 'u_1', email: 'retailer@example.com', role: 'RETAILER' });
    const res = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Adorn', slug: 'adorn2', template: 'minimal', phone: '0700111222', whatsapp: '0700111222' });

    expect(res.status).toBe(201);
    expect(prismaMock.store.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Adorn',
          slug: 'adorn2',
          settings: { create: { currency: 'UGX', location: 'Kampala, Uganda' } },
        }),
      }),
    );
    // Contact columns are persisted via raw SQL on the new store.
    expect(rawUpdates.some(s => s.includes('store_settings'))).toBe(true);
    expect(res.body.data.settings.phone).toBe('0700111222');
  });

  it('enforces one store per email', async () => {
    prismaMock.featureFlag.findUnique.mockResolvedValue({ key: 'storeCreation', enabled: true });
    prismaMock.store.count.mockResolvedValue(0);
    prismaMock.store.findUnique.mockResolvedValue(null);
    prismaMock.store.findFirst.mockResolvedValue({ id: 'store_1' });

    const token = tokenFor({ userId: 'u_1', email: 'retailer@example.com', role: 'RETAILER' });
    const res = await request(app)
      .post('/api/stores')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Second', slug: 'second-store' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already have a store');
  });
});
