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
import { isSecretKey } from '../utils/secrets';

const app = createApp();
const JWT_SECRET = (process.env.JWT_SECRET as string) || 'test-secret-for-unit-tests-0123456789';

function tokenFor(role: string): string {
  return jwt.sign({ userId: 'u_1', email: 'd@example.com', role }, JWT_SECRET, { expiresIn: '2h' });
}

const STORED_SETTINGS = [
  { key: 'FLUTTERWAVE_SECRET_KEY', value: 'FLWSECK-verysecret123' },
  { key: 'FLUTTERWAVE_PUBLIC_KEY', value: 'FLWPUBK-public-123' },
  { key: 'ELEVENLABS_API_KEY', value: 'sk-elevenlabs-secret' },
  { key: 'MOMO_MERCHANT_CODE', value: '7180236' },
  { key: 'STORAGE_PUBLIC_BASE_URL', value: 'https://pub-x.r2.dev' },
];

beforeEach(() => {
  vi.clearAllMocks();
  clearUserCache();
  prismaMock.killSwitch.findFirst.mockResolvedValue(undefined);
  prismaMock.setting.findMany.mockResolvedValue(STORED_SETTINGS);
});

describe('H9: secrets are masked for DEVELOPER, raw for SUPER_DEVELOPER', () => {
  it('classifies keys correctly', () => {
    expect(isSecretKey('FLUTTERWAVE_SECRET_KEY')).toBe(true);
    expect(isSecretKey('ELEVENLABS_API_KEY')).toBe(true);
    expect(isSecretKey('GMAIL_APP_PASSWORD')).toBe(true);
    expect(isSecretKey('STORAGE_ACCESS_KEY_ID')).toBe(true);
    expect(isSecretKey('FLUTTERWAVE_PUBLIC_KEY')).toBe(false);
    expect(isSecretKey('STORAGE_PUBLIC_BASE_URL')).toBe(false);
    expect(isSecretKey('MOMO_MERCHANT_CODE')).toBe(false);
    expect(isSecretKey('AUTH_REDIRECT_URL')).toBe(false);
  });

  it('DEVELOPER GET /settings: secrets masked, public values raw', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_1', role: 'DEVELOPER', isActive: true });
    const res = await request(app).get('/api/settings').set('Authorization', `Bearer ${tokenFor('DEVELOPER')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.FLUTTERWAVE_SECRET_KEY).toBe('••••t123');
    expect(res.body.data.ELEVENLABS_API_KEY).toBe('••••cret');
    expect(res.body.data.FLUTTERWAVE_PUBLIC_KEY).toBe('FLWPUBK-public-123');
    expect(res.body.data.MOMO_MERCHANT_CODE).toBe('7180236');
    expect(res.body.data.STORAGE_PUBLIC_BASE_URL).toBe('https://pub-x.r2.dev');
  });

  it('SUPER_DEVELOPER GET /settings: raw values (platform owner)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_1', role: 'SUPER_DEVELOPER', isActive: true });
    const res = await request(app).get('/api/settings').set('Authorization', `Bearer ${tokenFor('SUPER_DEVELOPER')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.FLUTTERWAVE_SECRET_KEY).toBe('FLWSECK-verysecret123');
  });

  it('DEVELOPER GET /api-config: masked; PUT with an echoed mask never overwrites the stored secret', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_1', role: 'DEVELOPER', isActive: true });

    const got = await request(app).get('/api/api-config').set('Authorization', `Bearer ${tokenFor('DEVELOPER')}`);
    expect(got.body.data.FLUTTERWAVE_SECRET_KEY).toBe('••••t123');

    // Dashboard "Save All" round-trips the masked value back:
    const put = await request(app)
      .put('/api/api-config')
      .set('Authorization', `Bearer ${tokenFor('DEVELOPER')}`)
      .send({ FLUTTERWAVE_SECRET_KEY: '••••t123', MOMO_MERCHANT_CODE: '7180236' });

    expect(put.status).toBe(200);
    const savedKeys = prismaMock.setting.upsert.mock.calls.map((c: any) => c[0].where.key);
    expect(savedKeys).toContain('MOMO_MERCHANT_CODE');
    expect(savedKeys).not.toContain('FLUTTERWAVE_SECRET_KEY'); // mask skipped
  });

  it('SUPER_DEVELOPER PUT still writes real secret values', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u_1', role: 'SUPER_DEVELOPER', isActive: true });
    const put = await request(app)
      .put('/api/api-config')
      .set('Authorization', `Bearer ${tokenFor('SUPER_DEVELOPER')}`)
      .send({ FLUTTERWAVE_SECRET_KEY: 'FLWSECK-new-real' });

    expect(put.status).toBe(200);
    const call = prismaMock.setting.upsert.mock.calls.find((c: any) => c[0].where.key === 'FLUTTERWAVE_SECRET_KEY');
    expect(call![0].update.value).toBe('FLWSECK-new-real');
  });
});
