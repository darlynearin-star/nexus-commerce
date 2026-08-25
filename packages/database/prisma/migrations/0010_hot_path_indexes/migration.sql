-- H14: FK/hot-path indexes (Postgres does NOT auto-index FK columns).
-- Names follow the Prisma convention so `prisma migrate` and the runtime
-- drift-sync (CREATE INDEX IF NOT EXISTS in packages/api/src/index.ts) stay
-- in agreement.

CREATE INDEX IF NOT EXISTS "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX IF NOT EXISTS "order_items_productId_idx" ON "order_items"("productId");
CREATE INDEX IF NOT EXISTS "carts_storeId_customerId_idx" ON "carts"("storeId", "customerId");
CREATE INDEX IF NOT EXISTS "carts_storeId_sessionId_idx" ON "carts"("storeId", "sessionId");
CREATE INDEX IF NOT EXISTS "media_storeId_createdAt_idx" ON "media"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "sessions_userId_isActive_idx" ON "sessions"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "reviews_productId_createdAt_idx" ON "reviews"("productId", "createdAt");
CREATE INDEX IF NOT EXISTS "subscription_payments_subscriptionId_createdAt_idx" ON "subscription_payments"("subscriptionId", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_createdAt_idx" ON "analytics_events"("createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_eventType_createdAt_idx" ON "analytics_events"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "analytics_events_sessionId_idx" ON "analytics_events"("sessionId");
CREATE INDEX IF NOT EXISTS "analytics_events_userId_idx" ON "analytics_events"("userId");
