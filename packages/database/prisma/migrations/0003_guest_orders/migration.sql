-- TASK-044: Guest checkout — orders no longer require a customer row.
-- Guest contact details are stored on the order itself.

ALTER TABLE "orders" ALTER COLUMN "customerId" DROP NOT NULL;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestEmail" TEXT NOT NULL DEFAULT '';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guestName" TEXT NOT NULL DEFAULT '';