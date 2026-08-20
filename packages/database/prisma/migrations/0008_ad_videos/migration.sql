-- Ad Studio: video generation jobs (URL + template → MP4)
CREATE TABLE IF NOT EXISTS "ad_videos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceUrl" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT '9:16',
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "videoUrl" TEXT,
  "script" JSONB,
  "error" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ad_videos_status_idx" ON "ad_videos"("status");
CREATE INDEX IF NOT EXISTS "ad_videos_templateId_idx" ON "ad_videos"("templateId");
