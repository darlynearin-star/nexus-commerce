# Architecture

## Package layout

```
packages/
  shared/              # Shared types/enums (roles, permissions, product status, etc.)
  database/            # Prisma schema, client, seed scripts, promote-admin
  api/                 # Express REST API (the platform backend)
  storefront/          # Next.js customer storefront (browse, cart, checkout, account)
  retailer-dashboard/  # Next.js dashboard for store owners
  developer-dashboard/ # Next.js dashboard for platform operators
```

Build order: `shared` → `database` → `api` → frontends. `transpilePackages: ['@nexus/shared']` in each Next config.

## Data flow

```
Browser (Next apps) ── /api/:path* rewrite (same-origin) or NEXT_PUBLIC_API_URL ──► Express API ──► PostgreSQL
                                     │                                              │
                                     └── Bearer access token (Authorization) ────────┘
```

- Every store-scoped request carries `x-store-slug`; `requireStore` middleware resolves it to a `storeId` (and enforces the store is active).
- Product/media detail routes use `requireStoreOwner` for owner-only access.
- Cross-app SSO: storefront redirects to dashboards with `#token=<accessToken>` in the hash; dashboards capture it and continue.

## Auth model

- Roles: `CUSTOMER`, `RETAILER`, `DEVELOPER`, `SUPER_DEVELOPER` (see `packages/shared`).
- Registration is locked to `CUSTOMER`; retailers are created via the create-store flow.
- Access token (JWT, short-lived, default 2h) carries `{ userId, email, role }`. The API re-reads the user's role from the DB on each request (60s TTL cache) so role changes take effect immediately; `invalidateUserCache()` is called on role changes.
- Refresh token (JWT, 7d) is validated against a `Session` row (`isActive`). Issued as an **httpOnly SameSite=Lax cookie** (Secure in prod) on login/register/magic-link/Google; also returned in the body for cross-origin SSO fallback. Logout deactivates the session and clears the cookie.
- Google OAuth uses a signed, 10-minute state parameter validated on callback.
- Password policy: min 8 chars, letters + digits (`utils/password-policy.ts`).
- Per-account login lockout: 5 consecutive failures → progressive backoff (`utils/login-attempts.ts`).
- `JWT_SECRET`/`JWT_REFRESH_SECRET` are required (fail-closed) via `config/env.ts` (zod-validated at module load).

## Middleware (packages/api/src/middleware)

| Middleware | Purpose |
|---|---|
| `auth.ts` | `authenticate`/`optionalAuth` (Bearer), `requirePermission`, role-freshness cache + `invalidateUserCache` |
| `resolve-store.ts` | `requireStore` (x-store-slug → storeId, store active), `requireStoreOwner` (owner/dev only) |
| `rate-limit.ts` | Global (300/15m), auth (30/15m), per-account login (10/15m) |
| `subscription-check.ts` | `requireActiveSubscription` for store owner routes |
| `feature-flags.ts` | `requireFeatureEnabled` gate (kill switches) |
| `error-handler.ts` | Central errors; includes `requestId`; hides internals in prod |

## Key routes (packages/api/src/routes)

- `auth.ts` — register, login (lockout), refresh (cookie/body), logout, magic link, Google OAuth, resend verification
- `stores.ts` — `/public` (store switcher), `/public/:slug`, `/mine`, CRUD, slug availability, toggle
- `products.ts`, `categories.ts`, `brands.ts`, `variants.ts` — catalog CRUD (owner-scoped)
- `cart.ts` — add/update/remove, coupon apply/remove (validates min order, limits, usage; records `CouponUsage`), totals
- `orders.ts` — create in a transaction with idempotency key, coupon re-validation, shipping (flat rate, free above threshold); status updates owner-only
- `payments.ts` — provider-initiated IPN verification (`knownPayment` guard; generic callback never trusts client status)
- `subscriptions.ts` — trial/plan state, renewal gate; invalidates role cache on lock/unlock
- `upload.ts` — media upload with `mimeFromFilename`, SVG refused, nosniff
- `admin.ts`, `kill-switch.ts`, `api-config.ts`, `announcements.ts`, `system.ts` — platform ops (developer/SUPER_DEVELOPER)

## Data layer

- Prisma ORM; single client in `packages/database`.
- Multi-tenant by `storeId` on store-scoped tables; orders/carts/items keyed to `(customer, store)`.
- Coupons: `Coupon` + `CouponUsage` (unique couponId+customerId).
- Orders: `idempotencyKey` unique per store to dedupe retries.
- DB mirror: optional `DATABASE_URL_FALLBACK` with a sync bridge (`utils/db-mirror.ts`); health at `/api/system/health`.

## Observability

- Structured JSON logs with level/ts/requestId (`utils/logger.ts`).
- Every response carries `X-Request-Id`; request lines log method/path/status/duration.
- Rate-limit and activity logs feed the developer dashboard (`/logs`).
- Security headers: CSP (no `unsafe-eval` on API; prod-gated strict CSP on Next apps), HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.