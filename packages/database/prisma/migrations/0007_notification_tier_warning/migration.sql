-- Add the TIER_WARNING value to the NotificationType enum that was missing
-- from the live database (the enum was originally created before TIER_WARNING
-- existed in the Prisma schema). Must run outside the transaction Prisma
-- wraps it in on PostgreSQL 12+ this is fine; IF NOT EXISTS keeps it idempotent.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'TIER_WARNING';