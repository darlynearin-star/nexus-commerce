import { describe, it, expect } from 'vitest';
import { isAccountLocked, recordFailure, recordSuccess } from './login-attempts';

// login-attempts keeps module-level in-memory state shared within a test file,
// so each test uses its own email address to stay independent.

describe('login-attempts', () => {
  it('starts unlocked', () => {
    expect(isAccountLocked('unlocked@example.com')).toEqual({ locked: false });
  });

  it('locks after 5 consecutive failures with progressive backoff', () => {
    for (let i = 0; i < 4; i++) recordFailure('lock@example.com');
    expect(isAccountLocked('lock@example.com').locked).toBe(false);
    recordFailure('lock@example.com'); // 5th -> locked
    const state = isAccountLocked('lock@example.com');
    expect(state.locked).toBe(true);
    expect(state.retryAfterMs).toBeGreaterThan(0);
    // progressive: first lock is BASE_LOCK_MS * 5 = 300_000ms
    expect(state.retryAfterMs!).toBeLessThanOrEqual(300_000);
  });

  it('treats email case-insensitively', () => {
    recordFailure('Buyer@Example.com');
    recordFailure('BUYER@example.com');
    recordFailure('buyer@example.com');
    recordFailure('buyer@example.com');
    expect(isAccountLocked('buyer@example.com').locked).toBe(false);
    recordFailure('buyer@example.com');
    expect(isAccountLocked('buyer@example.com').locked).toBe(true);
    // The same key locks regardless of casing:
    expect(isAccountLocked('BUYER@EXAMPLE.COM').locked).toBe(true);
  });

  it('clears lockout on recordSuccess', () => {
    for (let i = 0; i < 5; i++) recordFailure('clear@example.com');
    expect(isAccountLocked('clear@example.com').locked).toBe(true);
    recordSuccess('clear@example.com');
    expect(isAccountLocked('clear@example.com').locked).toBe(false);
  });

  it('does not clear another account on success', () => {
    for (let i = 0; i < 5; i++) recordFailure('a@example.com');
    recordFailure('b@example.com');
    recordSuccess('b@example.com');
    expect(isAccountLocked('a@example.com').locked).toBe(true);
    expect(isAccountLocked('b@example.com').locked).toBe(false);
  });
});