-- M-money: Payment.currency defaulted to USD while the platform sells in UGX;
-- rows inserted without an explicit currency would be mislabeled. Align with
-- the rest of the schema. (Existing rows untouched — definition-only change.)
-- Float money columns reviewed and kept: UGX is integral and coupon discounts
-- are rounded to whole units (utils/coupon-discount.ts), so Float64 is exact
-- for this platform.
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'UGX';
