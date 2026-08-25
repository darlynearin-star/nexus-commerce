import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureTokenFromUrl, isAcceptableHandoffToken, decodeJwt } from './jwt';

// ---- minimal browser stubs (jwt.ts touches window/localStorage) ----
const store = new Map<string, string>();
const replaceState = vi.fn();

function b64url(obj: any): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeToken(payload: any): string {
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.sig`;
}

function setHash(hash: string) {
  (globalThis as any).window = {
    location: { hash, pathname: '/dashboard' },
    history: { replaceState },
  };
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  };
}

beforeEach(() => {
  store.clear();
  replaceState.mockClear();
  setHash('');
});

describe('H3: #token= handoff fixation gate', () => {
  it('accepts a structurally valid, unexpired token: stores it, strips the URL', () => {
    const token = makeToken({ userId: 'u1', email: 'a@x.com', role: 'RETAILER', exp: Math.floor(Date.now() / 1000) + 3600 });
    setHash(`#token=${token}`);

    const result = captureTokenFromUrl();

    expect(result).toBe(token);
    expect(store.get('accessToken')).toBe(token);
    expect(replaceState).toHaveBeenCalledWith({}, '', '/dashboard');
  });

  it('REJECTS an expired token — session not replaced, URL still stripped', () => {
    const good = makeToken({ userId: 'victim', role: 'RETAILER', exp: Math.floor(Date.now() / 1000) + 3600 });
    store.set('accessToken', good);
    const expired = makeToken({ userId: 'attacker', role: 'SUPER_DEVELOPER', exp: Math.floor(Date.now() / 1000) - 60 });
    setHash(`#token=${expired}`);

    const result = captureTokenFromUrl();

    expect(result).toBeNull();
    expect(store.get('accessToken')).toBe(good); // victim session intact
    expect(replaceState).toHaveBeenCalled(); // crafted link never lingers
  });

  it('REJECTS malformed / junk tokens', () => {
    setHash('#token=not-a-jwt');
    expect(captureTokenFromUrl()).toBeNull();
    expect(store.has('accessToken')).toBe(false);

    setHash('#token=%%%junk');
    expect(captureTokenFromUrl()).toBeNull();
  });

  it('REJECTS tokens missing userId / role / exp claims', () => {
    setHash(`#token=${makeToken({ email: 'x@y.com', exp: Math.floor(Date.now() / 1000) + 3600 })}`);
    expect(captureTokenFromUrl()).toBeNull();

    setHash(`#token=${makeToken({ userId: 'u', role: 'CUSTOMER' })}`);
    expect(captureTokenFromUrl()).toBeNull();
  });

  it('non-token hashes are stripped without touching storage', () => {
    setHash('#something=else');
    expect(captureTokenFromUrl()).toBeNull();
    expect(replaceState).toHaveBeenCalled();
    expect(store.has('accessToken')).toBe(false);
  });

  it('no hash → no-op', () => {
    setHash('');
    expect(captureTokenFromUrl()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });

  it('isAcceptableHandoffToken allows 30s of clock skew', () => {
    const skewed = makeToken({ userId: 'u', role: 'RETAILER', exp: Math.floor(Date.now() / 1000) - 20 });
    expect(isAcceptableHandoffToken(skewed)).toBe(true);
  });

  it('decodeJwt handles base64url padding', () => {
    const payload = { userId: 'u', role: 'R', exp: 1, pad: 'x'.repeat(20) };
    const token = makeToken(payload);
    expect(decodeJwt(token)).toMatchObject({ userId: 'u', role: 'R' });
  });
});
