import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// Same Proxy-based prisma mock shape as security.test.ts.
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
import { canonicalEmail, findUserByEmail } from '../routes/auth';

const app = createApp();

const GOOD_PASSWORD = 'Str0ngPass!23';

/** The canonical lookup must be case-insensitive, never a plain equality. */
function expectInsensitiveLookup(value: unknown) {
  const arg = prismaMock.user.findFirst.mock.calls.at(-1)?.[0];
  expect(arg?.where?.email).toEqual({ equals: value, mode: 'insensitive' });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.setting.findUnique.mockResolvedValue(null);
  // The Setting table drives isEmailConfigured(); force the email path on.
  prismaMock.setting.findUnique.mockImplementation(({ where }: any) => {
    if (where?.key === 'GMAIL_USER') return Promise.resolve({ key: 'GMAIL_USER', value: 'bot@example.com' });
    if (where?.key === 'GMAIL_APP_PASSWORD') return Promise.resolve({ key: 'GMAIL_APP_PASSWORD', value: 'app-password' });
    return Promise.resolve(null);
  });
});

describe('canonicalEmail', () => {
  it('lowercases and trims', () => {
    expect(canonicalEmail('  Auth.Test@Example.COM ')).toBe('auth.test@example.com');
  });

  it('returns an empty string for non-strings instead of throwing', () => {
    expect(canonicalEmail(undefined)).toBe('');
    expect(canonicalEmail(null)).toBe('');
    expect(canonicalEmail(42)).toBe('');
  });
});

describe('email is treated as one identity regardless of case', () => {
  it('rejects a second registration that differs only in capitals', async () => {
    prismaMock.user.findFirst.mockResolvedValue({ id: 'u1', email: 'auth.test@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'AUTH.TEST@EXAMPLE.COM', password: GOOD_PASSWORD, firstName: 'A', lastName: 'B' });

    expect(res.status).toBe(409);
    expectInsensitiveLookup('auth.test@example.com');
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('stores the canonical address, never the capitals the user typed', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'u1', email: 'auth.test@example.com', firstName: 'A', lastName: 'B', role: 'CUSTOMER',
    });
    prismaMock.customer.create.mockResolvedValue({});

    await request(app)
      .post('/api/auth/register')
      .send({ email: 'Auth.Test@Example.COM', password: GOOD_PASSWORD, firstName: 'A', lastName: 'B' });

    expect(prismaMock.user.create.mock.calls[0][0].data.email).toBe('auth.test@example.com');
  });

  it('finds the account when login uses different capitals', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'auth.test@example.com',
      passwordHash: await bcrypt.hash(GOOD_PASSWORD, 4),
      isActive: true,
      emailVerified: true,
      role: 'CUSTOMER',
      firstName: 'A',
      lastName: 'B',
      avatar: null,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'AUTH.TEST@EXAMPLE.COM', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expectInsensitiveLookup('auth.test@example.com');
  });

  it('finds a legacy account that still holds mixed-case in the database', async () => {
    // Row written before canonicalisation. The lookup must still resolve it,
    // otherwise every existing mixed-case user is locked out on upgrade.
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'legacy', email: 'Legacy.User@Example.com',
      passwordHash: await bcrypt.hash(GOOD_PASSWORD, 4),
      isActive: true, emailVerified: true, role: 'CUSTOMER',
      firstName: 'L', lastName: 'U', avatar: null,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'legacy.user@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expectInsensitiveLookup('legacy.user@example.com');
  });

  it('sends a password reset to a mixed-case account asked for in lower case', async () => {
    // This is the lockout bug: the old code lowercased the input but matched
    // the stored row exactly, so the request matched nothing, replied with the
    // neutral "if registered" message, and emailed nobody.
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'legacy', email: 'Legacy.User@Example.com',
      passwordHash: null, isActive: true, emailVerified: true, role: 'CUSTOMER',
    });

    const res = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'legacy.user@example.com' });

    expect(res.status).toBe(200);
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledTimes(1);
    expectInsensitiveLookup('legacy.user@example.com');
  });

  it('still replies generically when no account matches, and emails nobody', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/password-reset/request')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/if this email is registered/i);
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('redeems a magic link when the browser hands back different capitals', async () => {
    const future = new Date(Date.now() + 10 * 60 * 1000);
    prismaMock.magicLinkToken.findUnique.mockResolvedValue({
      id: 't1', token: 'tok', email: 'auth.test@example.com', usedAt: null, expiresAt: future,
    });
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'u1', email: 'auth.test@example.com', passwordHash: null,
      isActive: true, emailVerified: true, role: 'CUSTOMER',
      firstName: 'A', lastName: 'B', avatar: null,
    });

    const res = await request(app)
      .post('/api/auth/magic-link/verify')
      .send({ token: 'tok', email: 'AUTH.TEST@EXAMPLE.COM' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('stores the magic link token against the canonical address', async () => {
    await request(app)
      .post('/api/auth/magic-link')
      .send({ email: 'Auth.Test@Example.COM' });

    expect(prismaMock.magicLinkToken.create.mock.calls[0][0].data.email).toBe('auth.test@example.com');
  });
});

describe('login lockout cannot be reset by changing capitals', () => {
  it('keys the attempt counter on the canonical address', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    // Burn several attempts with a mixed-case address, then come back in
    // lower case. If the counter were keyed on the raw string these would be
    // two independent buckets and the lockout would never trigger.
    for (const email of ['Auth.Test@Example.COM', 'AUTH.TEST@EXAMPLE.COM', 'auth.test@example.com']) {
      await request(app).post('/api/auth/login').send({ email, password: 'WrongPassword1!' });
    }

    const keys = prismaMock.user.findFirst.mock.calls.map(c => c[0].where.email.equals);
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe('auth.test@example.com');
  });
});

describe('findUserByEmail', () => {
  it('returns null without querying when the address is empty', async () => {
    expect(await findUserByEmail('')).toBeNull();
    expect(await findUserByEmail(undefined)).toBeNull();
    expect(prismaMock.user.findFirst).not.toHaveBeenCalled();
  });
});
