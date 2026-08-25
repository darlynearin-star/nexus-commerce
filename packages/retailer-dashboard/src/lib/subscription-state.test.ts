import { describe, it, expect } from 'vitest';
import { isSubscriptionLocked } from './subscription-state';

const future = new Date(Date.now() + 7 * 864e5).toISOString();
const past = new Date(Date.now() - 864e5).toISOString();

describe('H5: subscription lock decision is fail-closed', () => {
  it('locks when the status is UNKNOWN (fetch error) — the core H5 rule', () => {
    expect(isSubscriptionLocked(null, true)).toBe(true);
    expect(isSubscriptionLocked({ status: 'ACTIVE' }, true)).toBe(true);
  });

  it('opens for an active subscription', () => {
    expect(isSubscriptionLocked({ status: 'ACTIVE' }, false)).toBe(false);
  });

  it('opens for an unexpired trial', () => {
    expect(isSubscriptionLocked({ status: 'TRIAL', trialEnd: future }, false)).toBe(false);
  });

  it('locks for an expired trial', () => {
    expect(isSubscriptionLocked({ status: 'TRIAL', trialEnd: past }, false)).toBe(true);
  });

  it('locks for SUSPENDED and CANCELLED', () => {
    expect(isSubscriptionLocked({ status: 'SUSPENDED' }, false)).toBe(true);
    expect(isSubscriptionLocked({ status: 'CANCELLED' }, false)).toBe(true);
  });

  it('no record + no error stays open (non-retailer passthrough)', () => {
    expect(isSubscriptionLocked(null, false)).toBe(false);
  });
});
