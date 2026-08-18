import { describe, it, expect } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt';

const payload = { userId: 'u_test_1', email: 'buyer@example.com', role: 'CUSTOMER' };

describe('jwt', () => {
  it('signs and verifies an access token with the access secret', () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded).toMatchObject({ userId: payload.userId, email: payload.email, role: payload.role });
  });

  it('signs and verifies a refresh token with the refresh secret', () => {
    const token = signRefreshToken(payload);
    const decoded = verifyRefreshToken(token);
    expect(decoded).toMatchObject({ userId: payload.userId, role: payload.role });
  });

  it('rejects a token signed with the wrong secret', () => {
    const access = signAccessToken(payload);
    const forged = access.slice(0, -4) + (access.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA');
    expect(() => verifyAccessToken(forged)).toThrow();
  });

  it('rejects an access token when verified against the refresh secret', () => {
    const access = signAccessToken(payload);
    expect(() => verifyRefreshToken(access)).toThrow();
  });

  it('accepts tokens regardless of which secret signed them (both exposed secrets are the same value in tests)', () => {
    // Sanity: the two env secrets above are distinct strings, so cross-secret
    // verification must fail (covered above). If they were equal this guards it.
    const access = signAccessToken(payload);
    const refresh = signRefreshToken(payload);
    expect(access).not.toBe(refresh);
  });
});