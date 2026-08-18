// Pure coupon discount math, shared by the cart route (and unit-tested here).
// - PERCENTAGE discounts are rounded to whole currency units.
// - FIXED discounts are applied as-is (the caller caps them at the subtotal).
export function calculateCouponDiscount(discountType: string | undefined, discountValue: number, subtotal: number): number {
  if (discountType === 'PERCENTAGE') {
    return Math.round(subtotal * discountValue) / 100;
  }
  if (discountType === 'FIXED') {
    return Math.max(0, discountValue);
  }
  return 0;
}