import { describe, it, expect, beforeEach } from 'vitest';
import { calculateCouponDiscount } from './coupon-discount';

describe('calculateCouponDiscount', () => {
  it('computes a PERCENTAGE discount via Math.round(subtotal * value) / 100', () => {
    expect(calculateCouponDiscount('PERCENTAGE', 10, 1000)).toBe(100);
    expect(calculateCouponDiscount('PERCENTAGE', 25, 999)).toBe(249.75); // 999*25=24975 /100
    expect(calculateCouponDiscount('PERCENTAGE', 50, 0)).toBe(0);
  });

  it('applies a FIXED discount as-is and clamps negatives to zero', () => {
    expect(calculateCouponDiscount('FIXED', 500, 2000)).toBe(500);
    expect(calculateCouponDiscount('FIXED', -10, 2000)).toBe(0);
  });

  it('returns 0 for unknown or missing discount types', () => {
    expect(calculateCouponDiscount(undefined, 500, 2000)).toBe(0);
    expect(calculateCouponDiscount('BOGO', 500, 2000)).toBe(0);
  });
});