# R2 Object Storage Setup (one-time, ~15 minutes)

Moves all images/videos out of the Neon database into Cloudflare R2.
Benefits: frees Neon storage (0.5GB free tier), stops CU burn on every asset
view, shrinks the db-mirror dump (audit finding M-mirror), gives Ad Studio
videos near-unlimited storage at zero egress cost.

## 1. Create the bucket

1. Sign up / log in at https://dash.cloudflare.com (free plan works)
2. Left sidebar: **R2 Object Storage** -> **Create bucket**
3. Name: `lynnyx-assets` (anything works) -> Location: Automatic -> Create

## 2. Make it publicly readable

Inside the bucket -> **Settings** tab -> **Public access**:

- **Allow Access** via the `r2.dev` subdomain, note the URL
  (looks like `https://pub-xxxxxxxx.r2.dev`)
- Optional, nicer: connect a custom domain like `cdn.lynnyx.com` instead and
  use that as the public base URL below.

## 3. Create an API token

R2 page (not the bucket) -> **Account API Tokens** (top right) ->
**Create API Token**:

- Permission: **Object Read & Write**
- Scope: *Apply to specific buckets only* -> select your bucket
- Create, then copy the **Access Key ID**, **Secret Access Key**, and note the
  **Account ID** shown on the R2 overview page.

## 4. Set env vars on Render (API service)

| Key | Value |
|---|---|
| `STORAGE_PROVIDER` | `s3` |
| `STORAGE_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET` | `lynnyx-assets` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_ACCESS_KEY_ID` | from step 3 |
| `STORAGE_SECRET_ACCESS_KEY` | from step 3 |
| `STORAGE_PUBLIC_BASE_URL` | `https://pub-xxxxxxxx.r2.dev` (step 2 URL) |
| `STORAGE_FORCE_PATH_STYLE` | `true` |

Save; the service redeploys. New uploads go to R2 immediately (old DB blobs
keep serving until step 5 migrates them).

## 5. Migrate existing blobs

As a DEVELOPER user:

1. Dry-run first (changes nothing):
   ```
   GET https://nexus-api-69q5.onrender.com/api/admin/storage/backfill
   ```
   Returns counts + approximate MB for media images and Ad Studio videos.
2. Run it:
   ```
   POST https://nexus-api-69q5.onrender.com/api/admin/storage/backfill
   ```
   Moves up to 200 items per call; re-run POST until it replies
   `"All blobs migrated."`

Afterwards every asset URL points at R2, DB rows keep only metadata, and the
mirror dump shrinks automatically on its next refresh.

## Rollback / safety

- Nothing is deleted from R2 on failure; a failed upload leaves its DB blob
  intact so re-running is always safe.
- To go back to DB storage: remove the STORAGE_* env vars. Existing R2 URLs
  keep working (they are absolute); only new uploads land in the DB again.
