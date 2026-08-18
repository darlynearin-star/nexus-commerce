# NEXUS-COMMERCE — WEB APP DEEP AUDIT & IMPROVEMENT ASSESSMENT

## 1. EXECUTIVE SUMMARY

Nexus-Commerce is a genuinely ambitious multi-tenant e-commerce platform: a public storefront, a retailer dashboard, and a developer/ops dashboard, all fed by a single Express + Prisma + PostgreSQL API — all running on free-tier hosting (Render + Vercel + 3 env vars). It works. The editorial storefront design (Fraunces + Inter, brass/dark palette) is the best-looking part of the product, and the reliability thinking (kill switch, DB failover, subscription auto-trial, seed guard) is above average for a solo project.

But the audit found **one critical privilege-escalation vulnerability** (self-registration as `DEVELOPER`), a **second critical** one (publicly-derivable JWT secret when env vars are unset), an **unauthenticated data-destroying endpoint** (`POST /api/cart/dedup`), and a platform that is otherwise healthy but unproven: **zero automated tests, zero CI, zero README, no linting, and 100% client-side rendering** that guts SEO and performance.

Blunt truth: this is a functional prototype with a production-grade frontend skin and security that would not survive a security review. It is fixable — most of the critical items are a weekend's work.

**Overall score: 4.4 / 10**

## 2. APPLICATION UNDERSTANDING

**Monorepo** (npm workspaces), 6 packages:

| Package | Role | Stack |
|---|---|---|
| `shared` | Types + permissions matrix | TS |
| `database` | Prisma client + seed + db-mirror | Prisma 5 / Postgres |
| `api` | Backend REST API | Express 4, JWT, Zod, helmet, multer, rate-limit |
| `storefront` | Customer-facing store | Next.js 14 App Router, all `'use client'` |
| `retailer-dashboard` | Merchant tools | Next.js 14 |
| `developer-dashboard` | Ops/admin tools | Next.js 14 |

**Auth model:** JWT access (2h) + refresh (7d) in DB-backed sessions, tokens in `localStorage`, `#fragment`-based cross-dashboard SSO. Roles: CUSTOMER / RETAILER / DEVELOPER / SUPER_DEVELOPER with a permissions matrix in `shared`.

**Payments:** Pesapal (UGA) via callback/IPN; subscriptions charge on signup; manual lock/unlock.

**Deployment:** Render (API, free) + Vercel × 3, `next.config.js` rewrites `/api/*` → API host, hardcoded fallback URLs throughout.

## 3. OVERALL SCORE — 4.4 / 10

Weighted across the 12 pillars (Security and Reliability weighted higher). Component scores:

| Component | Score |
|---|---|
| Product | 5.5 |
| UX | 5.5 |
| UI | 6.5 |
| Engineering | 4.5 |
| Performance | 4.0 |
| Security | 3.5 |
| Accessibility | 3.5 |
| Reliability | 5.5 |
| Maintainability | 4.5 |

## 4. PILLAR SCORECARD

| # | Pillar | Score | One-line verdict |
|---|---|---|---|
| 1 | Product & UX | **5.5** | Real flows exist end-to-end; discovery/onboarding/thresholds unfinished |
| 2 | UI / Visual | **6.5** | Genuinely good editorial design; the strongest pillar |
| 3 | Frontend Engineering | **4.5** | Working, but client-only rendering + 3× duplicated libs + inline styles |
| 4 | Backend & Systems | **6.0** | Clean separation, middleware discipline; schema drift + no transactions |
| 5 | Performance | **4.0** | No SSR, no image optimization, ILIKE scans, base64 media in Postgres |
| 6 | Accessibility | **3.5** | Good intent (aria-labels, reduced-motion) undone by divs, unlabeled controls, no focus mgmt |
| 7 | Security | **3.5** | Two critical + several high findings; mitigations exist but don't cancel them |
| 8 | SEO | **3.0** | Client-side meta injection; no OG/canonical/JSON-LD; un-indexable products |
| 9 | Reliability | **5.5** | Excellent kill-switch/failover thinking; fragile payments and error paths |
| 10 | Code Quality / Maintainability | **4.5** | Good API layering, strict TS; `any` everywhere, no lint, schema drift |
| 11 | Testing & QA | **1.5** | Zero automated tests; QA is three untracked .txt files |
| 12 | Product Polish | **4.5** | Skeleton/empty-state care; undone by dead wishlist toggle and text "Loading..." screens |

## 5. DETAILED PILLAR ANALYSIS

### 5.1 Product & UX — 5.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Core commerce flow | 7 | `checkout/page.tsx`, `cart/page.tsx` | Browse→cart→checkout→pay works | Keep; add guest checkout | P2 |
| Store creation | 5 | `retailer-dashboard/src/app/register/page.tsx` | Single-store-only, no onboarding wizard | Post-signup store setup wizard | P2 |
| Discovery | 4 | `storefront/src/app/shop/page.tsx` | Flat list; search via `?search=`; no facets/sort/pagination UI | Facets, sort, pagination | P2 |
| Account UX | 4 | `storefront/src/app/account/*` | Token-hash SSO is clever but invisible; no password reset UI | Self-service reset flow | P1 |
| Cross-store selection | 5 | `store-context.tsx`, `?noStore=1` | "No store" mode is obscure | Clear store switcher | P2 |
| Wishlist | 3 | `product/[slug]/page.tsx` `toggleWishlist` | Toggle only ever ADDS; no remove path | Fix toggle semantics | P1 |
| Shipping/tax | 2 | `orders.ts`, `checkout` | Shipping rate config exists in settings but is never applied (always 0) | Implement or remove | P2 |

### 5.2 UI / Visual — 6.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Design system | 8 | `globals.css` tokens, brass palette, Fraunces+Inter | Cohesive, distinctive, on-brand | Encapsulate as a component lib | P3 |
| Storefront | 7 | `Header`, product cards | Best-looking surface | Extend tokens to dashboards | P3 |
| Dashboards | 5 | `retailer-dashboard`, `developer-dashboard` layouts | Visually separate from storefront; bespoke inline styling per app | Unify theme | P2 |
| Responsiveness | 6 | Sidebar drawers, media queries | Works but ad-hoc | Audit breakpoints | P3 |
| Consistency | 4 | 3× duplicated `api.ts`, 3× duplicated auth/theme code | Same component, 3 implementations, 3 styles | Shared UI package | P2 |

### 5.3 Frontend Engineering — 4.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Rendering strategy | 2 | `storefront/src/app/layout.tsx` is `'use client'`; every page `'use client'` | Zero SSR/SSG; slow TTFB, bad SEO, no RSC | Move to server components; client islands only | P1 |
| State management | 5 | Context (`store-context`, auth contexts) | Fine at this scale | OK; avoid adding redux | P4 |
| Duplication | 3 | `api.ts` ×3, `auth.tsx` ×3, guards ×3 | Bug fixes must be made 3× | Extract `@nexus/web` package | P2 |
| Typing | 4 | `any` throughout (`tsconfig.base.json` strict but code bypasses) | Defeats strict mode | `noImplicitAny` + eslint rule | P2 |
| Image handling | 3 | `<img>` everywhere, `picsum.photos` fallback | No `next/image`, unoptimized | Use `next/image` + local fallbacks | P2 |
| Loading UX | 4 | Text "Loading..." screens (subscriptions, product) | Feels unfinished | Skeleton everywhere | P3 |

### 5.4 Backend & Systems — 6.0/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Layering | 8 | `routes/`, `middleware/`, `utils/` split | Clean, testable | Keep | P4 |
| Middleware discipline | 8 | `resolve-store`, `requireStoreOwner`, `subscription-check`, `kill-switch` | Best-in-class for solo dev | Keep | P4 |
| Schema management | 3 | `index.ts` `runMigrations` uses raw `$executeRawUnsafe` ALTERs; `phone/whatsapp` not in `schema.prisma` | Drift between Prisma schema and DB | Prisma migrations + reconciler | P1 |
| Transactions | 3 | `orders.ts` create order+items+notify+clearcart | Non-atomic; duplicate-order risk on retry | `prisma.$transaction` + idempotency key | P1 |
| Payments | 4 | `payments.ts`, IPN no signature check | Fragile + unverified IPN | Verify provider signatures | P1 |
| Queue/jobs | 2 | none | Email, cleanup inline | Add simple job queue | P3 |
| Rate limiting | 6 | global 100/15min (`index.ts`) | Blocks legitimate heavy users; no per-account auth limits | Split per-route limits | P2 |

### 5.5 Performance — 4.0/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| First load | 3 | client layout, render-blocking `<link>` fonts | Slow TTFB + FCP on free tier | SSR + `next/font` | P1 |
| Image optimization | 3 | raw `<img>`, base64 in DB | MB-scale payloads | `next/image` + object storage + CDN | P1 |
| Queries | 4 | `search.ts` `contains` ILIKE | Table scans at scale | `pg_trgm` GIN index or FTS | P2 |
| Media storage | 3 | `Media.data TEXT` base64 | 10 MB → ~13.7 MB in Postgres; Render free 1 GB fills fast | S3/R2 + presigned URLs | P1 |
| Caching | 3 | no API cache layer; `cacheRouter` exists unused | Repeated identical queries | Basic in-memory TTL cache | P2 |
| Bundle | 4 | client layout loads everything | No route-level code splitting benefit | RSC migration | P2 |

### 5.6 Accessibility — 3.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Labels | 3 | checkout/register inputs: `<label>` with no `htmlFor`, inputs no `id` | Unassociable for SR users | Associate labels/ids | P1 |
| Focus management | 2 | drawer/sidebar no focus trap, no Escape close | Keyboard users trapped | Focus trap + Escape | P1 |
| Semantics | 4 | heavy `div`/`span` layout | Screen-reader garbage | Semantic landmarks | P2 |
| Icons | 5 | some `aria-label`, many bare icon-buttons | Mixed | Audit all icon buttons | P2 |
| Contrast | 5 | gold on dark, `#A8A096` secondary | Borderline | WCAG AA pass | P2 |
| Motion | 8 | `prefers-reduced-motion` in globals | Good | Keep | P4 |
| Focus styles | 6 | `.btn:focus-visible`, inputs have only glow | Improve input focus ring | Add visible focus-visible | P2 |

### 5.7 Security — 3.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| **Privilege escalation** | **1** | `auth.ts:49` `role = body.role === 'RETAILER' || 'DEVELOPER' ? body.role : 'CUSTOMER'` | **Any anonymous user can self-register as DEVELOPER with ALL permissions** | Server-side allowlist: only CUSTOMER at registration; verify identity for elevated roles | **P0** |
| **JWT secret** | **1** | `utils/jwt.ts` fallback `sha256('lyn-nxy-stores:'+prefix)` | **If `JWT_SECRET` unset, signing key is a public constant → anyone can mint a `SUPER_DEVELOPER` token for their own userId** (authenticate only checks user exists + isActive) | Require env secret; fail closed at boot | **P0** |
| **AuthZ freshness** | 3 | `middleware/auth.ts:23` role read from token | Role changes don't apply until expiry; forged tokens above bypass role checks | Re-fetch role from DB per request (or short TTL + cache) | **P0** |
| **Unauthenticated destructive endpoint** | 2 | `routes/cart.ts:9` `POST /api/cart/dedup` | No auth, deletes duplicate cart_items **globally across all stores** via `$executeRawUnsafe` | Remove endpoint; run as script only | **P0** |
| Google OAuth state | 3 | `auth.ts:376` state generated, never verified on callback | Login CSRF / session-fixation | Validate state against issued nonce | P1 |
| Payment IPN | 3 | `payments.ts:32`, `subscriptions.ts:127` no signature check | Unverified external callbacks | Verify provider HMAC/signatures | P1 |
| Stored uploads + CSP | 4 | `upload.ts:18` allows `svg`; CSP `script-src 'unsafe-inline' 'unsafe-eval'` (`index.ts:105`) | A retailer can host script-bearing files on the API origin | Strip/refuse SVG or serve `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`; tighten CSP | P1 |
| IDOR reads | 4 | `products.ts:235` `GET detail/:id` requires MANAGE_PRODUCTS but NOT `requireStoreOwner`; `media.ts` list requires only auth | Retailers can read any store's products incl. `costPerItem`; any user lists any store's media metadata | Add ownership checks on reads | P1 |
| Token storage | 4 | localStorage access + refresh (7d) | XSS → full account takeover incl. refresh token | httpOnly SameSite cookie refresh + short access | P2 |
| Login brute force | 5 | global limiter only | No per-account lockout | Per-account backoff | P2 |
| Password policy | 4 | min 6 chars (`auth.ts:36`) | Weak | Enforce ≥8 + complexity; reject breaches | P2 |
| Injection | 8 | Prisma + parameterized `$queryRaw`; Zod validation on key routes | Solid | Extend Zod everywhere | P4 |
| Headers | 7 | helmet, CORS allowlist, trust proxy | Good | Add CSP via nonces after inline-style removal | P3 |

### 5.8 SEO — 3.0/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Crawlability | 2 | all `'use client'`, product data fetched client-side | Product/store pages render nothing server-side | SSR/SSG critical paths | P1 |
| Metadata | 2 | `SeoManager.tsx` sets title/meta in `useEffect` | Crawlers mostly ignore JS-set meta | Server `metadata` export | P1 |
| OG/canonical/JSON-LD | 1 | none found | No social sharing, no rich results, duplicate-content risk | Add OG, canonical, product schema | P1 |
| robots/sitemap | 4 | `robots.txt` exists; no `sitemap.xml` | Partial | Generate sitemap | P2 |

### 5.9 Reliability — 5.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Kill switches | 9 | `kill-switch.ts`, flags in DB, dashboard toggle | Excellent | Keep | P4 |
| DB failover | 8 | `database/src/index.ts` `DB_MANUAL_SWITCH`, db-mirror | Thoughtful | Automate health checks | P3 |
| Startup migration | 4 | raw ALTER run at boot | Works but fragile; order-dependent | Prisma migrate | P1 |
| Error boundaries | 6 | `error.tsx`, `loading.tsx`, `ErrorBoundary` | Good | Add to dashboards | P2 |
| Order integrity | 3 | no transaction, no idempotency | Partial-failure duplicates | Transactions + idempotency key | P1 |
| Observability | 2 | `morgan` dev format only; no alerting | Blinds to issues until user reports | Structured logs + uptime alert + error tracking | P1 |

### 5.10 Code Quality / Maintainability — 4.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Type strictness | 5 | `strict: true` but `any` pervasive | Rules not enforced | eslint `no-explicit-any` gate | P2 |
| Config hygiene | 3 | `.gitignore` ignores `package-lock.json`; hardcoded URL fallbacks; no env validation | Non-reproducible installs, env drift | Commit lockfile; zod-validate env at boot | P1 |
| Documentation | 1 | no README anywhere; only untracked QA .txt files | Onboarding impossible | README + ARCHITECTURE.md | P2 |
| Lint/format | 0 | no `.eslintrc*`, no prettier config found | No automated standards | Add eslint + prettier | P2 |
| Code splitting | 4 | 3× duplicated clients/auth/guards | Triple maintenance | `@nexus/web` package | P2 |
| Naming/structure | 7 | routes/middleware/utils clear | Good | Keep | P4 |

### 5.11 Testing & QA — 1.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Unit tests | 0 | none found (glob `**/*.{test,spec}.{ts,tsx,js}`) | Zero coverage of business logic | Vitest + JSDOM for utils/calc | P1 |
| Integration tests | 0 | none | AuthZ/ownership regressions invisible | Supertest against test DB | P1 |
| E2E | 0 | Playwright in root devDeps, no config/tests | No user-journey safety net | Playwright: checkout, payments sandbox | P1 |
| CI | 0 | no `.github`, no yml | No gate on merge | GitHub Actions: lint+type+test+build | P1 |
| QA process | 3 | 3 untracked manual QA txt files | Manual-only, not versioned | Move into `/qa`, codify checklist | P3 |

### 5.12 Product Polish — 4.5/10

| Sub-area | Score | Evidence | Problem | Recommendation | Priority |
|---|---|---|---|---|---|
| Empty states | 7 | cart, shop, wishlist | Good | Keep | P4 |
| Skeletons | 5 | some | More pages use "Loading..." text | Standardize skeletons | P3 |
| Feedback | 4 | checkout message color logic inverted-ish; toasts exist | Inconsistent error/success surfacing | Unify toast system | P2 |
| Micro-interactions | 4 | minimal transitions on cart | Feels static | Add tasteful transitions | P3 |
| Themed consistency | 6 | dark/light switch works | Good | Extend to dashboards | P3 |

## 6. CRITICAL ISSUES (must fix first)

| # | Issue | Severity | Where |
|---|---|---|---|
| C1 | Anonymous self-registration as DEVELOPER = full platform takeover | **Critical** | `packages/api/src/routes/auth.ts:49` |
| C2 | JWT secret is a public constant when env unset = token forgery | **Critical** | `packages/api/src/utils/jwt.ts` |
| C3 | Role served from token, never re-checked against DB | **High** | `packages/api/src/middleware/auth.ts:23` |
| C4 | `POST /api/cart/dedup` unauthenticated, deletes globally | **Critical** | `packages/api/src/routes/cart.ts:9` |
| C5 | Google OAuth state never validated (login CSRF) | **High** | `packages/api/src/routes/auth.ts` |
| C6 | Payment IPN without signature verification | **High** | `payments.ts`, `subscriptions.ts` |
| C7 | IDOR reads: products detail + media list lack ownership checks | **High** | `products.ts:235`, `media.ts` |

## 7. CROSS-CUTTING ISSUES

1. **No automated verification anywhere** — testing, lint, type gates, CI all absent; the repo relies on manual QA text files. Everything else compounds this.
2. **Free-tier blind spots** — 1 GB Postgres + base64 media + unoptimized images + client-rendered Next = guaranteed growth wall.
3. **Hardcoded environments** — URLs/secrets duplicated in code with silent fallbacks; no single env schema; CORS/CSP baked to one host (`index.ts:108-121`).
4. **Triplicated frontend** — 3 dashboards, 3 copies of api/auth/theme; fixes must be applied 3×.
5. **Prisma schema ≠ database** — raw-ALTER migrations, columns missing from schema accessed via raw SQL (`stores.ts:22`, `orders.ts:82`).

## 8. TOP 10 IMPROVEMENTS

Ranked by **Impact × Urgency × Confidence ÷ Effort** (I×U×C÷E), higher = better.

| # | Improvement | Impact | Urgency | Confidence | Effort | I×U×C÷E | Class |
|---|---|---|---|---|---|---|---|
| 1 | Fix C1: lock registration to CUSTOMER; verify elevated roles | 10 | 10 | 10 | 1 | 1000 | **Quick win** |
| 2 | Fix C2: require `JWT_SECRET`/`JWT_REFRESH_SECRET` env, fail closed | 10 | 10 | 10 | 1 | 1000 | **Quick win** |
| 3 | Fix C3: re-fetch role from DB (cache 60s) | 10 | 9 | 9 | 1 | 810 | **Quick win** |
| 4 | Fix C4: remove public `/cart/dedup` endpoint | 9 | 10 | 10 | 1 | 900 | **Quick win** |
| 5 | Add lint + type-check + test + build CI gate | 8 | 8 | 9 | 2 | 288 | **Medium project** |
| 6 | Add Vitest unit + Supertest integration suite for API | 8 | 7 | 8 | 3 | 149 | **Medium project** |
| 7 | Move media to object storage + presigned URLs | 8 | 6 | 8 | 3 | 128 | **Medium project** |
| 8 | Convert storefront to SSR/SSG (metadata, `next/image`, `next/font`) | 9 | 6 | 7 | 4 | 94 | **Major refactor** |
| 9 | Prisma migrations + schema reconciliation (kill raw ALTERs) | 7 | 6 | 8 | 2 | 168 | **Medium project** |
| 10 | Wrap order creation in transaction + idempotency key | 7 | 6 | 8 | 2 | 168 | **Medium project** |

### Quick Wins (this week)
- C1, C2, C3, C4 (registration lock, env secrets, DB role check, remove dedup) — roughly 4–6 hours total, removes the four most severe issues.
- C5: validate OAuth state.
- `.gitignore`: stop ignoring `package-lock.json`.
- Env validation via zod at API boot.

### Major Refactors (this quarter)
- SSR/SSG migration of storefront (SEO + performance + a11y win in one).
- Media → S3/R2 + presigned; drop `Media.data`.
- Extract `@nexus/web` shared UI/API package (ends 3× duplication).
- Prisma migrations replacing runtime raw SQL.

### Architectural Change (next)
- Payments: webhook signature verification + provider sandbox in CI.
- Add a minimal job queue (email delivery, cleanup) — current inline-await email blocks order completion.

## 9. ROADMAP

| Phase | Scope | Estimated effort |
|---|---|---|
| **Phase 1 — Stabilize & secure (now)** | C1–C7, env secrets, remove dedup, DB role check, CI lint/type/test gate | 1–2 weeks |
| **Phase 2 — Prove correctness** | Vitest + Supertest for API authz/ownership; Playwright checkout/payments sandbox; README | 2–3 weeks |
| **Phase 3 — Performance & SEO** | SSR/SSG storefront, `next/image`, `next/font`, metadata/OG/JSON-LD/sitemap; object-storage media; pg_trgm search | 3–6 weeks |
| **Phase 4 — Scale & polish** | Prisma migrations, transactions+idempotency, shared UI package, per-route rate limits, per-account auth lockout, structured logging + alerting | 4–8 weeks |

## 10. WHAT IS ALREADY EXCELLENT

- **Kill-switch architecture** — runtime kill flags toggled from a dashboard is production-grade thinking.
- **DB failover with manual switch** — rare for a free-tier app.
- **Middleware discipline** — `resolveStore` + `requireStoreOwner` + subscription auto-trial is the right spine for multi-tenancy.
- **Design system** — the storefront identity (Fraunces/Inter, brass palette, dark mode, reduced-motion) is genuinely publishable.
- **Seed safety** (`SEED_FORCE`), error boundaries, skeleton/empty-state care, parameterized SQL, Zod on key routes, helmet + CORS allowlist.

## 11. BRUTALLY HONEST ASSESSMENT

1. **If you demoed this to a security reviewer tomorrow, the first thing they'd find is that anyone can register a DEVELOPER account and take over the platform.** Everything else is downstream of that.
2. **The security posture only "works" because nobody is attacking you yet** — the moment the domain goes live on `lynnyx-stores.eu.org`, bots will start probing `/api/auth`, `/api/cart/dedup`, and the payment callbacks.
3. **Zero tests is the single biggest long-term debt.** The codebase is small enough to test now and too big to test later.
4. **Your design is better than your engineering, and your engineering is better than your security and testing.** The imbalance is a risk: great UI gives users confidence the whole product is mature.
5. **Free tier has a hard ceiling here.** 1 GB Postgres + base64 images will stall you; plan object storage before launch traffic.
6. **"It works on my machine" is the current QA strategy.** The three QA .txt files are not versioned, not automated, and will drift.
7. **The SSR gap is your cheapest high-visibility win** — with a public domain and SEO goals, client-only rendering means Google sees blank pages for your products.
8. **You've made good ownership decisions** (requireStoreOwner, kill switches) but the critical bugs show they're applied inconsistently — reads are less protected than writes.
9. **Duplication will eat you.** Three copies of auth/API/theme means a security fix must be made three times or missed once.
10. **Honest overall: a promising 4.4/10** — fix the four criticals this week and you're at a genuinely respectable ~6.5 with the roadmap.

## 12. FINAL RECOMMENDATION

Do **Phase 1 immediately** (C1–C7 are mostly single-line to small-change fixes; C1–C4 alone remove the four most severe issues in under a day). Set up a CI gate on the same branch. Then apply **Phase 2** tests before any feature work — the platform is small enough to become fully covered quickly, and it will finally make the three QA txt files redundant. Defer domain cutover and SEO push until the SSR migration (Phase 3) so you don't index blank pages. The product vision and design deserve better engineering armor; give it to them.