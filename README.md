# Nexus Commerce

Enterprise-grade e-commerce platform: a customer storefront, retailer dashboard, developer dashboard, and a shared API/database monorepo.

## Prerequisites

- Node.js 18+
- npm 9+ (workspaces)
- A PostgreSQL database (primary + optional fallback)

## Getting Started

```bash
npm install
npm run setup          # builds shared, generates Prisma client, pushes schema, seeds demo data
```

The `setup` script runs: `npm install` → build `packages/shared` → `db:generate` → `db:push` → `db:seed`.

### Run locally

```bash
npm run dev            # API + storefront + retailer + developer concurrently
```

Individual services:

```bash
npm run dev:api        # Express API on :4000
npm run dev:storefront # Next.js on :3000
npm run dev:retailer   # Next.js on :3001
npm run dev:developer  # Next.js on :3002
```

### Database

```bash
npm run db:generate    # prisma generate
npm run db:push        # push schema to DB (dev)
npm run db:migrate     # prisma migrate deploy
npm run db:seed        # seed demo stores/products/orders
```

> Note: existing deployments apply runtime legacy ALTERs unless `RUN_LEGACY_MIGRATIONS=false` is set. New installations should use `db:push`/`db:migrate` and the baseline migration under `packages/database/prisma/migrations/0001_legacy_schema_baseline`.

## Environment Variables

### API (`packages/api`) — required

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Primary PostgreSQL connection string |
| `DATABASE_URL_FALLBACK` | No | Optional mirrored/fallback DB (see db-mirror) |
| `JWT_SECRET` | Yes | Access-token signing secret (min 16 chars). Fail-closed: startup errors if missing. |
| `JWT_REFRESH_SECRET` | Yes | Refresh-token signing secret (min 16 chars). Fail-closed. |
| `JWT_ACCESS_TTL` | No | Access token TTL, default `2h` |
| `PORT` | No | Default `4000` |
| `CORS_ORIGIN` | No | Comma-separated allow-list. `*` reflects origin with `credentials: false`. |
| `CSP_CONNECT_SRC` | No | CSP `connect-src` (space/comma list), defaults to self + API origin |
| `CSP_IMG_SRC` | No | CSP `img-src`, defaults to self/data/blob/cloudinary/picsum/API origin |
| `STOREFRONT_URL` | No | Used for storefront redirects in payments/products |
| `RETAILER_DASHBOARD_URL` | No | Used for subscription redirects |
| `DEVELOPER_DASHBOARD_URL` | No | Developer dashboard origin |
| `RENDER_EXTERNAL_URL` | No | Public API URL used in upload URLs (set LAST after cutover) |
| `STORAGE_PROVIDER` | No | `db` (default) stores media as base64 in Postgres; `s3` uses an S3-compatible bucket |
| `STORAGE_ENDPOINT` | No | S3-compatible endpoint (Cloudflare R2: `https://<accountid>.r2.cloudflarestorage.com`) |
| `STORAGE_REGION` | No | Region, default `auto` (R2) |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | No | S3 credentials (only when `STORAGE_PROVIDER=s3`) |
| `STORAGE_BUCKET` | No | Bucket name |
| `STORAGE_PUBLIC_BASE_URL` | No | Public base URL for stored objects (e.g. `https://media.<domain>`) |
| `STORAGE_FORCE_PATH_STYLE` | No | `true` for MinIO/path-style; default false (virtual-host) |
| `RUN_LEGACY_MIGRATIONS` | No | `"false"` disables runtime legacy ALTERs |
| `DEBUG` | No | Enables debug-level log lines |

### Storefront (`packages/storefront`)

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_URL` | API base (empty string = same-origin via Next rewrite `/api/:path*`) |
| `NEXT_PUBLIC_STOREFRONT_URL` | Public storefront URL (SSO redirects) |
| `NEXT_PUBLIC_RETAILER_DASHBOARD_URL` | Retailer dashboard URL (SSO) |
| `NEXT_PUBLIC_DEVELOPER_DASHBOARD_URL` | Developer dashboard URL (SSO) |

### Retailer & Developer dashboards

Same `NEXT_PUBLIC_*` vars as storefront, plus:

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_UPLOAD_URL` | Retailer only: base for `api.upload()` (defaults to API origin) |

### Provider credentials (stored in DB `Setting` table, settable via developer dashboard)

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_REDIRECT_URL`, `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET`, `PESAPAL_CONSUMER_KEY`, `PESAPAL_CONSUMER_SECRET`, `PESAPAL_IPN_URL`, `PESAPAL_BASE_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BREVO_API_KEY`, `BREVO_SMTP_LOGIN`, `BREVO_SMTP_KEY`, `BREVO_FROM_EMAIL`, `BREVO_FROM_NAME`. Fallbacks read some from `process.env` (e.g. `FLUTTERWAVE_SECRET_KEY`).

## Scripts

```bash
npm run lint           # ESLint (typescript-eslint, warn-level)
npm run format         # Prettier write (requires `npm i -D prettier`)
npm run build          # Builds all packages in dependency order
npm run typecheck      # Per-package: npx tsc --noEmit -p <pkg>/tsconfig.json
```

## Deployment

- API → Render (or any Node host). Set all required env vars before start; the API fails fast on missing secrets.
- Storefront, retailer, developer → Vercel. Set `NEXT_PUBLIC_*` per app and the API URL.
- Next apps proxy `/api/:path*` to the API via `next.config.js` rewrites (`API_URL`/`NEXT_PUBLIC_API_URL`).
- See `ARCHITECTURE.md` for the auth model, data flow, and key routes.

## QA

Runbooks and manual QA results live in `qa/` (see `NEXUS_COMMERCE_EXHAUSTIVE_QA_REPORT.txt`, findings log, and UI workflow manual). See `NEXUS_COMMERCE_DEEP_AUDIT_ASSESSMENT.md` and `MASTER_EXECUTION_PLAN.md` for the audit and remediation plan.