-- Nexus-Commerce baseline schema (drift reconciliation)
-- This migration captures the column/table state that the API previously applied
-- via runtime raw ALTERs. New installs apply this through `prisma migrate deploy`
-- or `prisma db push`; existing deployments keep the legacy runtime path
-- (RUN_LEGACY_MIGRATIONS, default on).

-- store_settings: contact columns
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS whatsapp TEXT NOT NULL DEFAULT '';

-- products: short code + images
ALTER TABLE products ADD COLUMN IF NOT EXISTS "shortCode" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS products_shortcode_idx ON products("shortCode") WHERE "shortCode" IS NOT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- media: DB-backed upload payload
ALTER TABLE media ADD COLUMN IF NOT EXISTS data TEXT;

-- products: category becomes optional
DO $$ BEGIN ALTER TABLE products ALTER COLUMN "categoryId" DROP NOT NULL; EXCEPTION WHEN others THEN NULL; END $$;

-- orders: fulfillment/contact fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customerPhone" TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "shippingAddress" TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'pay_on_delivery';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "estimatedDelivery" TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotencykey_key ON orders("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- users: google oauth + optional password
ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleId" TEXT;
ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_googleid_key ON users("googleId") WHERE "googleId" IS NOT NULL;

-- magic links
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- coupon usage tracking (per-customer cap)
CREATE TABLE IF NOT EXISTS coupon_usage (
  id TEXT PRIMARY KEY,
  "couponId" TEXT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  "customerId" TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT coupon_usage_coupon_customer_key UNIQUE ("couponId", "customerId")
);

-- search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;