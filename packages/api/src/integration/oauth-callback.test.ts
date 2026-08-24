import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

import { clearUserCache } from '../middleware/auth';
import { createApp } from '../index';

const app = createApp();
const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';

function validState(): string {
  return jwt.sign({ purpose: 'google-oauth', nonce: 'n_1' }, JWT_SECRET, { expiresIn: '10m' });
}

const EXISTING_USER = {
  id: 'u_g', email: 'g@example.com', googleId: 'sub_123', isActive: true, role: 'CUSTOMER',
  firstName: 'Goo', lastName: 'Gle', emailVerified: true, avatar: null, passwordHash: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.setting.findUnique.mockImplementation(async ({ where: { key } }: any) => {
    if (key === 'GOOGLE_CLIENT_ID') return { key, value: 'client-id' };
    if (key === 'GOOGLE_CLIENT_SECRET') return { key, value: 'client-secret' };
    return undefined;
  });
  prismaMock.user.findUnique.mockResolvedValue(EXISTING_USER);
  // The existing-user path backfills emailVerified/googleId/avatar via update.
  prismaMock.user.update.mockResolvedValue(EXISTING_USER);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubGoogle(opts: { tokenOk?: boolean; userinfoOk?: boolean; profile?: any } = {}) {
  const { tokenOk = true, userinfoOk = true, profile = { sub: 'sub_123', email: 'g@example.com', given_name: 'Goo' } } = opts;
  vi.stubGlobal('fetch', vi.fn(async (url: any) => {
    const u = String(url);
    if (u.includes('oauth2.googleapis.com/token')) {
      return { ok: tokenOk, json: async () => ({ access_token: 'goog-access' }) };
    }
    if (u.includes('googleapis.com/oauth2/v3/userinfo')) {
      return { ok: userinfoOk, json: async () => profile };
    }
    throw new Error(`unexpected fetch ${u}`);
  }));
}

describe('C5: Google OAuth tokens are delivered in the fragment, never the query', () => {
  it('successful callback redirects with tokens in #fragment only', async () => {
    stubGoogle();
    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: 'good-code', state: validState() })
      .redirects(0);

    expect(res.status, JSON.stringify(res.body)).toBe(302);
    const location = res.headers.location as string;
    expect(location).toContain('/auth/callback#');
    expect(location).toContain('access_token=');
    expect(location).toContain('refresh_token=');
    // The leak: tokens must never appear as query parameters.
    const query = location.split('?')[1] || '';
    expect(query).not.toContain('accessToken');
    expect(query).not.toContain('refreshToken');
    expect(location.includes('?accessToken=')).toBe(false);
  });

  it('fragment values are URL-encoded (JWTs contain base64url chars that are safe, but encoding must not corrupt)', async () => {
    stubGoogle();
    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: 'good-code', state: validState() })
      .redirects(0);
    const location = res.headers.location as string;
    const frag = new URLSearchParams(location.split('#')[1]);
    expect(frag.get('access_token')).toBeTruthy();
    expect(frag.get('refresh_token')).toBeTruthy();
    // Decoded tokens must be valid JWTs (3 segments) — no double-encoding damage.
    expect(frag.get('access_token')!.split('.')).toHaveLength(3);
    expect(frag.get('refresh_token')!.split('.')).toHaveLength(3);
  });

  it('error paths never contain token material', async () => {
    stubGoogle({ tokenOk: false });
    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: 'bad-code', state: validState() })
      .redirects(0);
    expect(res.headers.location).toContain('error=google_token_failed');
    expect(res.headers.location).not.toContain('token=');
    expect(res.headers.location).not.toContain('Token=');
  });

  it('suspended account path carries no tokens', async () => {
    stubGoogle();
    const suspended = { ...EXISTING_USER, isActive: false };
    prismaMock.user.findUnique.mockResolvedValue(suspended);
    // The route re-reads the user from the update() return — keep it suspended.
    prismaMock.user.update.mockResolvedValue(suspended);
    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: 'good-code', state: validState() })
      .redirects(0);
    expect(res.headers.location).toContain('error=account_suspended');
    expect(res.headers.location).not.toContain('access_token');
    expect(res.headers.location).not.toContain('refresh_token');
  });

  it('forged state is still rejected before any token is minted', async () => {
    stubGoogle();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await request(app)
      .get('/api/auth/google/callback')
      .query({ code: 'x', state: 'forged' })
      .redirects(0);
    expect(res.headers.location).toContain('google_state_invalid');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
