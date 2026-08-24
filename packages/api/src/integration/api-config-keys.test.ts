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

import { clearUserCache } from '../middleware/auth';
import { createApp } from '../index';

const app = createApp();
const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';

function devToken(): string {
  return jwt.sign({ userId: 'u_dev', email: 'dev@example.com', role: 'SUPER_DEVELOPER' }, JWT_SECRET, { expiresIn: '2h' });
}

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.user.findUnique.mockResolvedValue({ id: 'u_dev', role: 'SUPER_DEVELOPER', isActive: true });
});

describe('C2: api-config persists the Ad Studio / MoMo / Storage keys', () => {
  it('PUT saves MOMO_*, ELEVENLABS_* and STORAGE_* keys (previously silently dropped)', async () => {
    const res = await request(app)
      .put('/api/api-config')
      .set('Authorization', `Bearer ${devToken()}`)
      .send({
        MOMO_MERCHANT_CODE: '7180236',
        MOMO_NUMBER: '740157510',
        MOMO_ACCOUNT_NAME: 'JOSEPHINE - Lyn-nyx stores',
        ELEVENLABS_API_KEY: 'sk_test_key',
        ELEVENLABS_VOICE_ID: 'EXAVITQu4vr4xnSDxMaL',
        ELEVENLABS_MODEL: 'eleven_multilingual_v2',
        STORAGE_PROVIDER: 's3',
        STORAGE_ENDPOINT: 'https://acct.r2.cloudflarestorage.com',
        STORAGE_BUCKET: 'lynnyx-ads',
        STORAGE_REGION: 'auto',
        STORAGE_ACCESS_KEY_ID: 'AKID',
        STORAGE_SECRET_ACCESS_KEY: 'SECRET',
        STORAGE_PUBLIC_BASE_URL: 'https://pub-xyz.r2.dev',
        STORAGE_FORCE_PATH_STYLE: 'false',
      });

    expect(res.status).toBe(200);
    const saved = prismaMock.setting.upsert.mock.calls.map(c => c[0].where.key);
    for (const key of [
      'MOMO_MERCHANT_CODE', 'MOMO_NUMBER', 'MOMO_ACCOUNT_NAME',
      'ELEVENLABS_API_KEY', 'ELEVENLABS_VOICE_ID', 'ELEVENLABS_MODEL',
      'STORAGE_PROVIDER', 'STORAGE_ENDPOINT', 'STORAGE_BUCKET', 'STORAGE_REGION',
      'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_PUBLIC_BASE_URL', 'STORAGE_FORCE_PATH_STYLE',
    ]) {
      expect(saved).toContain(key);
    }
    // Values round-trip intact.
    const momo = prismaMock.setting.upsert.mock.calls.find(c => c[0].where.key === 'MOMO_MERCHANT_CODE')![0];
    expect(momo.update.value).toBe('7180236');
    expect(momo.create.value).toBe('7180236');
  });

  it('GET returns the newly-allowed keys from settings', async () => {
    prismaMock.setting.findMany.mockResolvedValue([
      { key: 'MOMO_MERCHANT_CODE', value: '7180236' },
      { key: 'ELEVENLABS_API_KEY', value: 'sk_test_key' },
      { key: 'STORAGE_BUCKET', value: 'lynnyx-ads' },
    ]);
    const res = await request(app).get('/api/api-config').set('Authorization', `Bearer ${devToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.MOMO_MERCHANT_CODE).toBe('7180236');
    expect(res.body.data.ELEVENLABS_API_KEY).toBe('sk_test_key');
    expect(res.body.data.STORAGE_BUCKET).toBe('lynnyx-ads');
    // The GET query must include the new keys in its allowlist filter.
    const queried = prismaMock.setting.findMany.mock.calls[0][0].where.key.in;
    expect(queried).toContain('ELEVENLABS_API_KEY');
    expect(queried).toContain('STORAGE_PUBLIC_BASE_URL');
    expect(queried).toContain('MOMO_ACCOUNT_NAME');
  });

  it('still rejects keys outside the allowlist (allowlist discipline preserved)', async () => {
    const res = await request(app)
      .put('/api/api-config')
      .set('Authorization', `Bearer ${devToken()}`)
      .send({ TOTALLY_UNKNOWN_KEY: 'x', FLUTTERWAVE_SECRET_KEY: 'kept' });
    expect(res.status).toBe(200);
    const saved = prismaMock.setting.upsert.mock.calls.map(c => c[0].where.key);
    expect(saved).toContain('FLUTTERWAVE_SECRET_KEY');
    expect(saved).not.toContain('TOTALLY_UNKNOWN_KEY');
  });

  it('rejects non-developer roles', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_ret', role: 'RETAILER', isActive: true });
    const token = jwt.sign({ userId: 'u_ret', email: 'r@example.com', role: 'RETAILER' }, JWT_SECRET, { expiresIn: '2h' });
    const res = await request(app).put('/api/api-config').set('Authorization', `Bearer ${token}`).send({ MOMO_MERCHANT_CODE: 'x' });
    expect(res.status).toBe(403);
    expect(prismaMock.setting.upsert).not.toHaveBeenCalled();
  });
});
