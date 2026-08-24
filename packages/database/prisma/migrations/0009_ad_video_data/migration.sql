-- Ad Studio: DB-fallback storage for rendered MP4s (base64). Ads are platform
-- assets and deliberately do NOT go through the Media table, whose storeId is
-- a hard FK to stores. When S3/R2 is configured, videos upload to object
-- storage instead and this column stays NULL.
ALTER TABLE "ad_videos" ADD COLUMN IF NOT EXISTS "data" TEXT;
