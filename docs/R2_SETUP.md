# R2 Object Storage Setup (one-time, ~15 minutes)

Moves all images/videos out of the database into Cloudflare R2.
Benefits: shrinks the PostgreSQL tables in Supabase (they now hold base64
blobs), makes the db-mirror dump dramatically smaller (audit finding
M-mirror), stops burning compute/bandwidth on every asset view (assets are
served straight from Cloudflare's edge, zero egress), and gives Ad Studio
videos near-unlimited storage at no egress cost.

Free tier (does not expire): 10 GB-month storage, 1M Class A (write/list)
ops/month, 10M Class B (read/HEAD) ops/month, $0 egress forever. Deletes are
free and count against nothing.

What the API expects (see `packages/api/src/utils/storage.ts` +
`utils/backfill.ts`):

| Env var | Meaning |
|---|---|
| `STORAGE_PROVIDER` | `s3` switches uploads to object storage |
| `STORAGE_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `STORAGE_BUCKET` | bucket name (e.g. `lynnyx-assets`) |
| `STORAGE_REGION` | keep `auto` — R2 ignores the region field |
| `STORAGE_ACCESS_KEY_ID` | R2 API token access key |
| `STORAGE_SECRET_ACCESS_KEY` | R2 API token secret |
| `STORAGE_PUBLIC_BASE_URL` | public base used to build URLs. **No trailing slash.** |
| `STORAGE_FORCE_PATH_STYLE` | `true` (API signs path-style: `/bucket/key`) |

## 1. Create the bucket

1. Sign up / log in at https://dash.cloudflare.com (free plan works).
2. Left sidebar: **R2 Object Storage** -> **Create bucket**.
3. Name: `lynnyx-assets`, Location: Automatic, Create.

## 2. Make it publicly readable (managed r2.dev URL)

Inside the bucket -> **Settings** -> **Public access** -> enable **Public
Development URL** (managed `r2.dev` subdomain). Note the URL, it looks like
`https://pub-<hash>.r2.dev`. This is what `STORAGE_PUBLIC_BASE_URL` points at.

r2.dev is *testing-grade*: it rate-limits (hundreds of requests/second ->
429) and may throttle bandwidth. Fine for this store's traffic now. When the
`lynnyx.com` domain is live (Phase D), connect the bucket to a custom domain
(e.g. `cdn.lynnyx.com`) instead — same dashboard section, "Custom domains" —
and update `STORAGE_PUBLIC_BASE_URL` to `https://cdn.lynnyx.com`. Do this
*only if* you later use Cloudflare Access/WAF token auth: disallow the
r2.dev URL then, otherwise the bucket stays public through it.

## 3. Create an API token

R2 page -> **Account API Tokens** (top right) -> **Create API Token**:

- Permission: **Object Read & Write** (needed for Put/Get/Delete, and the
  backfill's uploads).
- Scope: *Apply to specific bucket(s) only* -> select `lynnyx-assets`.
- Create, then copy **Access Key ID** and **Secret Access Key**.
- Also copy your **Account ID** (right side of the R2 Overview page, or the
  32-hex segment in the dashboard URL `dash.cloudflare.com/<ACCOUNT_ID>/...`).

The secret is shown only once — store it immediately.

## 4. Set env vars on Render (API service)

Add the 8 env vars from the table above to the Render service. Enter the
values exactly, no quotes, no trailing whitespace, and no trailing `/` on
`STORAGE_PUBLIC_BASE_URL`. Save -> the service redeploys.

Example:
```
STORAGE_PROVIDER=s3
STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
STORAGE_BUCKET=lynnyx-assets
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=<...>
STORAGE_SECRET_ACCESS_KEY=<...>
STORAGE_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev
STORAGE_FORCE_PATH_STYLE=true
```

**Wait for the deploy to go green before continuing.** New uploads go to R2
immediately after that (old DB blobs keep serving from their existing URLs
until step 5 migrates them).

## 5. Verify new uploads actually reach R2 (before running the backfill)

In any store that has media, upload a fresh image. Confirm the stored media
URL now begins with your `STORAGE_PUBLIC_BASE_URL`, the object appears in
the `lynnyx-assets` bucket in the Cloudflare dashboard, and it loads in the
storefront. This isolates wiring mistakes from the migration itself.

## 6. Migrate existing blobs

As a DEVELOPER / SUPER_DEVELOPER user (needs the `MANAGE_SYSTEM`
permission; the backfill routes are `/api/admin/storage/backfill`):

1. Dry-run first (changes nothing):
   ```
   GET  https://nexus-api-69q5.onrender.com/api/admin/storage/backfill
   ```
   Returns counts + approximate MB for Media images and Ad Studio videos.
   If it replies `"configured": false`, the env vars are wrong or the
   redeploy hasn't finished.
2. Run it:
   ```
   POST https://nexus-api-69q5.onrender.com/api/admin/storage/backfill
   ```
   Moves up to 200 items per call. Re-run the POST until the report shows
   `mediaRemaining: 0` and `adsRemaining: 0`.

## 7. Post-migration checks

- A few product images load from the r2.dev URL in the storefront and both
  dashboards (storefront's `next.config` remote patterns already allow any
  https host — no code change needed).
- Ad Studio video play/pause + download/open from the dashboard.
- The db-mirror snapshot shrinks on its next refresh (blobs are gone from
  the DB), and Supabase tables trim down (check `MEDIA.data` /
  `AD_VIDEO.data` are NULL via the APIs).
- Watch R2 -> **Usage** for the first days: storage, Class A and Class B op
  counts to confirm you're inside the free tier.

## Safety / rollback

- Nothing is deleted from R2 on failure; a failed upload leaves its DB blob
  intact, so re-running the backfill is always safe.
- The backfill only nulls a blob *after* its R2 upload succeeds, item by
  item.
- To go back to DB storage: remove the `STORAGE_*` env vars. Existing R2
  URLs keep working (they are absolute); only new uploads land in the DB
  again.
- Do not delete the R2 bucket while absolute asset URLs are in the database.