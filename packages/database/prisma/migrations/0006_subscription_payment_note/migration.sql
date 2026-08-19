-- Subscription payments: optional note from the payer (e.g. mobile money
-- transaction id / payer number) used by the owner to reconcile manual payments.
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS "customerNote" TEXT;