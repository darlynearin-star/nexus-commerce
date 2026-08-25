import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createApiClient, ApiError } from './api';

const store = new Map<string, string>();
const fetchMock = vi.fn();

function jsonResponse(status: number, body: any) {
  return {
    ok: status >= 200 && status < 300,
    status,
    clone() { return this; },
    json: async () => body,
  };
}

beforeEach(() => {
  store.clear();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
  (globalThis as any).window = { location: { pathname: '/dashboard', href: '' } };
  fetchMock.mockReset();
  (globalThis as any).fetch = fetchMock;
});

describe('H4: 401/refresh handling in the shared API client', () => {
  it('guest 401: NO refresh call, NO redirect — clean 401 to the caller', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'Authentication required' }));
    const client = createApiClient();

    const err = await client.api.get('/wishlist').catch((e: any) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
    const refreshCalls = fetchMock.mock.calls.filter((c: any) => String(c[0]).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(0);
    expect((globalThis as any).window.location.href).toBe(''); // no yank to /login
  });

  it('logged-in 401: refreshes once, retries with the new token, returns data', async () => {
    store.set('accessToken', 'old');
    store.set('refreshToken', 'rt');
    fetchMock.mockImplementation(async (url: any, init: any) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) return jsonResponse(200, { data: { accessToken: 'new' } });
      if ((init?.headers as any)?.Authorization === 'Bearer new') return jsonResponse(200, { ok: true });
      return jsonResponse(401, { error: 'expired' });
    });
    const client = createApiClient();

    const result = await client.api.get('/orders');

    expect(result).toEqual({ ok: true });
    const refreshCalls = fetchMock.mock.calls.filter((c: any) => String(c[0]).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('single-flight: three concurrent 401s share ONE refresh call', async () => {
    store.set('accessToken', 'old');
    store.set('refreshToken', 'rt');
    fetchMock.mockImplementation(async (url: any, init: any) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) {
        await new Promise(r => setTimeout(r, 10)); // hold it open to force sharing
        return jsonResponse(200, { data: { accessToken: 'new' } });
      }
      if ((init?.headers as any)?.Authorization === 'Bearer new') return jsonResponse(200, { ok: true });
      return jsonResponse(401, { error: 'expired' });
    });
    const client = createApiClient();

    const results = await Promise.all([
      client.api.get('/a'), client.api.get('/b'), client.api.get('/c'),
    ]);

    expect(results).toHaveLength(3);
    const refreshCalls = fetchMock.mock.calls.filter((c: any) => String(c[0]).includes('/auth/refresh'));
    expect(refreshCalls).toHaveLength(1);
  });

  it('failed refresh clears the session and does NOT redirect when already on /login', async () => {
    store.set('accessToken', 'old');
    store.set('refreshToken', 'rt');
    (globalThis as any).window = { location: { pathname: '/login', href: '' } };
    fetchMock.mockImplementation(async (url: any) => {
      if (String(url).includes('/auth/refresh')) return jsonResponse(401, { error: 'invalid' });
      return jsonResponse(401, { error: 'expired' });
    });
    const client = createApiClient();

    const err = await client.api.get('/orders').catch((e: any) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Session expired');
    expect(store.has('accessToken')).toBe(false);
    expect(store.has('refreshToken')).toBe(false);
    expect((globalThis as any).window.location.href).toBe(''); // no /login loop
  });

  it('upload 401 with dead refresh also clears the session (parity with request)', async () => {
    store.set('accessToken', 'old');
    store.set('refreshToken', 'rt');
    fetchMock.mockImplementation(async (url: any) => jsonResponse(401, { error: 'no' }));
    const client = createApiClient();

    const fd = new FormData();
    const err = await client.api.upload('/media', fd).catch((e: any) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(store.has('accessToken')).toBe(false);
    expect(store.has('refreshToken')).toBe(false);
  });
});
