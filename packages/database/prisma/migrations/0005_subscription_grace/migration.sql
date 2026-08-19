-- Track the subscription grace period for auto-suspension of idle/unpaid stores
ALTER TABLE retailer_subscriptions ADD COLUMN IF NOT EXISTS "graceNotifiedAt" TIMESTAMP;
ALTER TABLE retailer_subscriptions ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP;