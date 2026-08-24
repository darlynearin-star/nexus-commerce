# AUDIT_REFERENCE.md — Nexus-Commerce Audit (Source of Truth)

> Created from the full codebase audit (API, database, 3 frontends, infra/config).
> This file is the durable knowledge base. Findings are never deleted — if investigation
> proves a finding inaccurate, append evidence + conclusion under the finding and mark it
> in `AUDIT_STATUS.md` (see statuses there).
>
> Companion file: `AUDIT_STATUS.md` (live progress tracker).

---

## Architecture facts (learned during remediation — shared knowledge)

*(appended as discovered; referenced by finding IDs instead of re-investigating)*

- **DB ownership model**: `Media.storeId` is a hard FK → `Store` (schema.prisma:411-412, onDelete: Cascade). `Notification.userId`, `ActivityLog.userId` are hard FKs → `User`. `Store.ownerId` is a hard FK → `User`. There is no "system" user or "ad-studio" store row in code, seed, or migrations.
- **Migration strategy**: live DB predates migrations; it is kept compatible via runtime drift-sync `runMigrations()` in `packages/api/src/index.ts` (idempotent `ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` / `ALTER TYPE ADD VALUE IF NOT EXISTS`). `migrations/0001` is NOT a baseline — it assumes pre-existing tables. Fresh `prisma migrate deploy` fails.
- **Auth architecture**: JWT access (2h) + refresh (7d) in localStorage on the frontends. `authenticate` middleware re-loads role/isActive from DB with a 60s cache (`middleware/auth.ts`). Cross-app SSO passes tokens via URL `#token=` fragment, parsed by `packages/web/src/jwt.ts` and stripped via `history.replaceState`. Google OAuth callback returns tokens as **query params** to `storefront/app/auth/callback`.
- **Storage architecture**: `packages/api/src/utils/storage.ts` — `STORAGE_PROVIDER=s3` (R2/MinIO/AWS, SigV4, zero-egress R2 preferred) or `'db'` fallback (base64 in `Media.data`). `storage.store()` requires a valid `storeId` (FK). S3 PUT helper `putS3Object` is module-private.
- **API config architecture**: `routes/api-config.ts` persists provider secrets in the `settings` table but **filters writes through a hardcoded `ALL_KEYS` allowlist** (line 14-26, 39). `routes/settings.ts` GET returns ALL settings unmasked (H9).
- **Payment lifecycle**: Pesapal (redirect + IPN + callback) → `verifySubscriptionPayment()` → payment PAID + `activateSubscriptionAndStore()`; manual MoMo → retailer `report-paid` → developer `confirm`; Flutterwave webhook → `verif-hash` header compare. Order payments: `payments.ts markPaid`.
- **Fallback DB behavior**: `db-mirror.ts` mirrors primary→fallback at boot when primary healthy; change detection = row counts only; restore-on-boot if fallback empty (non-transactional, once-only); writes on fallback are never reconciled back.
- **Test infrastructure**: Vitest + supertest; `@nexus/database` mocked with a hoisted Proxy (`vi.mock`); `$transaction`/`$queryRaw`/`$executeRaw` must be assigned directly on the mock in tests. `npm run test -w packages/api` from repo root; `npm run db:generate` must run from root.
- **Windows/PowerShell env**; git origin `master`; PAT lacks `workflow` scope (CI workflow unpushable).

---

## ORIGINAL AUDIT (verbatim, preserved)

**Scope:** API, database, 3 frontends, infra/config.
**Verdict:** strong foundation, but 5 critical issues — 3 of them in code shipped this week.

### 🔴 CRITICAL

**C1. Ad Studio will fail on first render — FK violation.** `ad-render.ts` stores video with `storeId: 'ad-studio'`, but `Media.storeId` is a real FK to `Store` (schema.prisma:411). No store row `ad-studio` is ever created → every render dies at `media.create` with P2003. *(bug in Ad Studio code)*

**C2. api-config silently drops the new keys.** `api-config.ts:14-26` has a hardcoded `ALL_KEYS` allowlist; `PUT` filters to it (line 39). `MOMO_*`, `ELEVENLABS_*`, `STORAGE_*` are **not in the list** → the dashboard fields save nothing, while claiming "N keys saved". *(bug in Ad Studio support code)*

**C3. No baseline migration.** `0001` only ALTERs — a fresh `prisma migrate deploy` fails immediately. The live DB works only via the runtime drift-sync + legacy tables. Fresh deploys are impossible; `settings`, `kill_switch`, `feature_flags`, `analytics_events` exist in **no migration at all**.

**C4. Subscription replay = free subscription.** `verifySubscriptionPayment` (subscriptions.ts:145-164) has no `status != 'PAID'` guard — a replayed Pesapal IPN/callback re-runs activation and pushes `nextBillingDate` out **every time**. Confirm flow (112-128) also isn't wrapped in `$transaction` (payment marked PAID, store can stay suspended on crash).

**C5. Google OAuth tokens in query params.** `storefront/app/auth/callback/page.tsx` reads access+refresh tokens from `?accessToken=...`, stores them, **never strips the URL** → credentials sit in browser history and server logs. (The `#token=` hash flow at least strips itself; this one doesn't.)

### 🟠 HIGH

| # | Area | Finding |
|---|---|---|
| H1 | Enforcer | `userId = user?.id || 'system'` written to `Notification.userId` (**FK**) → P2003; no per-iteration try/catch → one bad row aborts the whole run, and the suspension commits *before* the throw (store suspended, owner never notified). `subscription-enforcer.ts:67,81,116` |
| H2 | Audit loss | `logActivity({userId:'system'})` in subscription callbacks violates `ActivityLog.userId` FK and is swallowed → renewal/webhook audit records silently never persist. `subscriptions.ts:189,232,281` |
| H3 | Token fixation | `#token=` from any crafted link is written into localStorage **during render**, overwriting the victim's session. `web/jwt.ts:11-21`, dashboards call it in render |
| H4 | Random logouts | 401-refresh condition is always true in browsers + no single-flight → N parallel refreshes invalidate each other. `web/api.ts:72-96` |
| H5 | Guard fail-open | Retailer subscription guard sets `locked=false` on any fetch error → blocking the API unlocks the dashboard. `subscription-guard.tsx:18` |
| H6 | N+1 blob leak | `media.findMany` with no `select` pulls the **base64 data column for every row** (strip-after ≠ not-fetched). 200×5MB images ≈ 1GB transfer per page. `media.ts:13` |
| H7 | Mirror staleness | Fallback mirror detects changes by **row counts only** — updates (price edit, password change) never re-mirror; restore isn't transactional (half-restored = skipped forever); writes made while on fallback are **discarded** on switch-back. `db-mirror.ts` |
| H8 | Backups | Every backup appends a **full DB dump incl. base64 media** into one `settings` row, no retention cap; re-read+rewrites the whole array each time. `backups.ts:18-56` |
| H9 | Secrets exposure | `GET /settings` returns **all secrets unmasked** (payment keys, webhook secrets) to plain DEVELOPER role. `settings.ts:11-18` |
| H10 | Dockerfile.api is broken (2×) | `npm ci` needs all 7 workspace package.jsons — only 3 are COPYd → build fails; and `build -w packages/api` requires `@nexus/database` **built first** (imports its `dist/`), which the Dockerfile never builds. |
| H11 | Theme leak | Store themes write CSS vars to `documentElement` with no unmount cleanup → leave a store and the whole main site keeps the store's colors. `StoreShell.tsx` |
| H12 | Cross-store cart | `activeStoreSlug` seeded globally to `'adorn'`; cart falls back to `'adorn'`, checkout-success to `'shop'` → items can land in the wrong store's cart. `ClientProviders.tsx:12`, `cart:12`, `checkout:62` |
| H13 | Silent money-action failures | Retailer orders `updateStatus`: no try/catch, no busy state, no confirm on Cancel → failed status changes look successful; double-click double-fires. `orders/page.tsx:16-20` (same on subscription Activate/Cancel buttons) |
| H14 | Missing indexes | Zero indexes on: `OrderItem.orderId/productId`, `Cart.customerId/sessionId`, `Media.storeId`, `Session.userId`, `Review.productId`, `SubscriptionPayment.subscriptionId`, all of `AnalyticsEvent`. Postgres does **not** auto-index FKs — these are the hottest paths. |

### 🟡 MEDIUM

- **M-money**: Money as Float everywhere; `Payment.currency` defaults `"USD"` while the platform is UGX (schema.prisma:513) — a charge row without explicit currency mislabels amounts.
- **M-killswitch**: Kill-switch fails open if the active (fallback) DB lacks its table — protection disappears exactly when degraded.
- **M-mirror**: Mirror dump in one JSON row — whole DB (incl. media base64) serialized into `settings.value`; >~1GB hard-fails; executed back via `$executeRawUnsafe` (injection vector if tampered).
- **M-prune**: No pruning for `analytics_events` (also zero indexes), `activity_logs`, `notifications`, expired `sessions`.
- **M-csp**: CSP `script-src 'unsafe-inline'` in all three frontends while JWTs sit in localStorage — CSP currently provides no XSS mitigation.
- **M-video**: `/uploads/:id` buffers whole MP4 in RAM, no **Range support** → no seeking; iOS Safari often won't play. Documents (PDFs) are public capability-URLs.
- **M-sigterm**: No SIGTERM handler → Render deploys kill in-flight ad renders; stuck `RENDERING` rows never requeued on boot.
- **M-ssrf**: `captureUrl` fetches any URL (developer-gated, can probe internal endpoints); ads/batch no rate limit beyond global, unbounded `templateIds`.
- **M-timing**: Flutterwave webhook compare `hash !== secret` — not timing-safe.
- **M-deps**: prisma CLI `^5.10.0` vs client `^5.22.0`; multer 1.x (known CVEs); `tsx` in prod dependencies.
- **M-authmodels**: Three auth trust models (storefront `/auth/me` vs dashboards `decodeJwt` vs developer layout guard with no roles).
- **M-categories**: Categories GET performs writes (auto-sync + double fetch) on hot public path.
- **M-img**: Image host mismatch — dashboards allow `hostname:'**'`, storefront whitelists 3 → retailer logos break on storefront.
- **M-grid**: `minmax(400px, 1fr)` on both settings pages — phone overflow (same class as fixed product-grid).

### ⚪ LOW

- **L-magicidx**: `magic_link_tokens` missing email index in migrations.
- **L-verified**: `isVerifiedPurchase` always true (never checked). `reviews.ts:30-32`
- **L-wishlist**: Wishlist always shows picsum placeholder, never real images. `wishlist/page.tsx:37`
- **L-membersince**: "Member Since" renders today's date. `account/page.tsx:162`
- **L-urlenc**: Search queries not URL-encoded (`dresses & skirts` breaks). `Header.tsx:145`, `StoreHeader.tsx:79`
- **L-slug**: Slug availability check per keystroke, no debounce/abort. `create-store/page.tsx:60-64`
- **L-dates**: Date-format drift (`en-US` vs locale).
- **L-ann**: Announcements array grows unbounded.
- **L-role**: Role-mismatch redirects to /login instead of "no access".

### ✅ Done well (preserve — reuse these patterns)

1. `config/env.ts` — JWT secrets fail-closed via zod (min 16 chars, no fallback).
2. Order placement (`routes/orders.ts:118-152`) — atomic `$transaction` + idempotency key + item re-validation. **Reference pattern for money flows.**
3. `authenticate` middleware — role/isActive loaded from DB (60s cache); token claims never trusted for authz. **Reference for authz.**
4. Idempotent migration style (`IF NOT EXISTS`) + correct partial unique indexes.
5. Zero `dangerouslySetInnerHTML` anywhere; uploads derive content-type server-side, refuse SVG.
6. Developer subscriptions page — gold standard money-action UX (busy states, confirms, error banners). **Reference for H13.**

### Conflicts & inefficiencies

- Dual sources of truth: `runMigrations()` drift-sync vs `migrations/` vs db-push history (e.g. `orders.paymentStatus` TEXT on legacy vs enum on pushed DBs).
- Frontend drift: 3 auth models, 3 api-client configs, ~30 hardcoded URLs across 5 hosts (several with no env escape).
- Kill-switch ↔ fallback-DB fail-open interplay; api-config ALL_KEYS vs dashboard fields; Dockerfile vs workspace layout.
- Inefficiency hot-spots: kill-switch DB hit per request (no cache), media N+1 base64, categories GET writes, admin cleanup per-row loops, full-DB mirror at boot, backups rewrite-whole-array.

### Original suggested fix order

C1+C2 (Ad Studio actually works) → C4 (revenue integrity) → H1+H2 (enforcer) → C5+H3 (token hygiene) → H10 (Dockerfile before Render flip) → H14+H6 (one index/select migration) → medium list.
*(Program order supersedes where the tasking specifies: C1, C2, C4, C5, then C3.)*

---

## REMEDIATION PLAN (per finding)

Template per finding: Priority / Finding ID / Area / Problem / Affected files / Intended fix / Acceptance criteria / Dependencies / Verification requirements / Current state.

### C1 — Ad Studio FK violation
- **Priority**: P0 (Critical) · **Area**: API / Ad Studio / storage
- **Problem**: `runAdVideoJob` calls `storage.store({ storeId: 'ad-studio', ... })`; `Media.storeId` is a hard FK to `Store`; no such row exists → P2003 on every render.
- **Affected files**: `packages/api/src/utils/ad-render.ts`, `packages/api/src/utils/storage.ts`, `packages/database/prisma/schema.prisma`, new migration.
- **Intended fix**: Decouple ad videos from store media. Add `data TEXT?` to `AdVideo` (DB-fallback path stores base64 there; served via `GET /api/ads/:id/download`). When S3/R2 configured, upload directly via newly-exported `putS3Object` (no Media row at all). No fake store rows.
- **Acceptance criteria**: (1) Render succeeds on a clean DB with no `ad-studio` Store. (2) No Media row created for ads. (3) R2 path returns public URL; DB path serves via download route. (4) Existing store media flows untouched. (5) Failure paths mark job FAILED without partial rows.
- **Dependencies**: none. **Verification**: unit/integration test of job runner with mocked prisma; tsc; existing 59 tests pass.
- **Current state**: NOT STARTED

### C2 — api-config drops new keys
- **Priority**: P0 · **Area**: API / api-config
- **Problem**: `ALL_KEYS` allowlist omits `MOMO_*`, `ELEVENLABS_*`, `STORAGE_*`; PUT filters them out silently.
- **Affected files**: `packages/api/src/routes/api-config.ts`
- **Intended fix**: Extend `KEY_PREFIXES`/`ALL_KEYS` with `MOMO_`, `ELEVENLABS_`, `STORAGE_` (explicit keys + ENABLED/LAST_TESTED suffixes consistent with existing pattern).
- **Acceptance criteria**: (1) PUT persists each new key; (2) GET returns them; (3) unknown keys still rejected; (4) existing keys unaffected.
- **Dependencies**: none. **Verification**: integration test PUT+GET round-trip incl. rejection of unknown key.
- **Current state**: NOT STARTED

### C4 — Subscription replay / transaction integrity
- **Priority**: P0 · **Area**: API / payments / subscriptions
- **Problem**: `verifySubscriptionPayment` re-activates and extends `nextBillingDate` on every replay; confirm + webhook paths do multi-step writes without `$transaction`.
- **Affected files**: `packages/api/src/routes/subscriptions.ts`
- **Intended fix**: Idempotency guard (`if payment.status === 'PAID'` → return current state without reactivation) in `verifySubscriptionPayment`; wrap payment-update + subscription-activation + store-reactivation in one `$transaction` (refactor `activateSubscriptionAndStore` to accept a tx client); same treatment for `/confirm` and Flutterwave webhook subscription branch.
- **Acceptance criteria**: (1) Replay of IPN/callback/verify after PAID does NOT extend billing dates or re-activate. (2) First successful event activates once. (3) All three writes atomic. (4) Manual `/confirm` on already-PAID stays no-op. (5) Invariant: *a replayed event grants no additional entitlement*.
- **Dependencies**: none. **Verification**: integration tests — first callback, duplicate callback, callback after PAID, concurrent-shape (sequential double-fire), failure mid-flow; full suite regression.
- **Current state**: NOT STARTED

### C5 — OAuth tokens in query params
- **Priority**: P0 · **Area**: API auth + storefront
- **Problem**: Google callback redirects to storefront with `?accessToken=...&refreshToken=...`; page stores tokens and never cleans the URL → token leakage via history/logs.
- **Affected files**: `packages/api/src/routes/auth.ts` (google callback redirect), `packages/storefront/src/app/auth/callback/page.tsx`
- **Intended fix**: API redirects with **URL fragment** (`#access_token=...`) instead of query (fragments never hit server logs); callback page reads fragment, strips via `history.replaceState`, and also strips legacy query params if present. Keep backward-compat read of query (already-deployed API) but always strip.
- **Acceptance criteria**: (1) No tokens remain in URL after callback completes (query or hash). (2) Login still completes. (3) Server never receives tokens in a request URL (fragment path). (4) Failure paths (error param) redirect cleanly without tokens.
- **Dependencies**: none. **Verification**: unit test on the parsing helper; manual trace of redirect construction; tsc/builds.
- **Current state**: NOT STARTED

### C3 — Baseline migration
- **Priority**: P1 (after C1/C2/C4/C5; investigate early if other fixes need migrations) · **Area**: database
- **Problem**: `0001` assumes pre-existing tables; fresh `migrate deploy` fails; several tables consumed by code exist in no migration.
- **Affected files**: `packages/database/prisma/migrations/*`, schema.prisma
- **Intended fix**: Investigate feasibility of a true baseline (`0000_init`) covering all schema models incl. `settings`, `kill_switch`, `feature_flags`, `analytics_events`; must be idempotent-safe against the legacy live DB path (drift-sync remains the live-DB mechanism; baseline serves fresh installs).
- **Acceptance criteria**: (1) Clean database + `prisma migrate deploy` → all tables/enums/indexes exist. (2) App boots against it. (3) Legacy live DB path unaffected. (4) Documented divergence notes (TEXT vs enum columns) resolved or documented.
- **Dependencies**: informs H14 (indexes migration). **Verification**: clean-DB migration chain test (local ephemeral Postgres if available; otherwise documented manual procedure + prisma validate + SQL review).
- **Current state**: IMPLEMENTED (0000_init created via `prisma migrate diff --from-empty`, 49 objects incl. settings/kill_switch/feature_flags/analytics_events/ad_videos; static chain-idempotency proof complete — all later migrations IF NOT EXISTS/no-op-safe; prisma validate 🚀). **Execution proof on a live clean Postgres outstanding** (no Docker/PG in env) — see AUDIT_STATUS.md for the one-command verification. Legacy-DB protection: deployment rule documented in migration header (drift-sync remains the production mechanism; `migrate resolve` procedure documented).

*(Phase 2/3/4 remediation entries are appended to this file as each finding enters INVESTIGATING.)*
