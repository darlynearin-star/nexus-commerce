# AUDIT_STATUS.md — Live Remediation Tracker

> Updated after every meaningful step. Statuses: `NOT STARTED` · `INVESTIGATING` · `IMPLEMENTING` · `TESTING` · `VERIFIED` · `BLOCKED` · `NEEDS FOLLOW-UP` · `WONT FIX` (justified only).
> Source of truth for findings: `AUDIT_REFERENCE.md`.

| ID | Severity | Finding | Status | Files Changed | Tests | Verification | Notes |
|----|----------|---------|--------|---------------|-------|--------------|-------|
| C1 | Critical | Ad Studio FK violation (`ad-studio` store) | VERIFIED | schema.prisma (AdVideo.data); migrations/0009_ad_video_data; api/src/index.ts (runtime ALTER); api/src/utils/storage.ts (export putS3Object+getApiBase; **fixed latent path-style S3 bug `/{bucket}{key}`→`/{bucket}/{key}`**); api/src/utils/ad-render.ts (storeAdResult decoupling, field-select in job); api/src/routes/ads.ts (download route + AD_VIDEO_FIELDS selects); integration/ad-render-storage.test.ts (new) | 8 new tests (DB path, S3 path w/ live mock endpoint, partial-config degrade, download 200/404×2, list/detail select-exclusion ×2) | tsc clean; full suite 67/67 (was 59) | Root cause: ads routed through store-media pipeline requiring a Store FK. Extra root cause found by testing: `signS3Request` built path-style URLs as `/{bucket}{key}` (missing slash) — every path-style R2/S3 PUT would have failed; existing round-trip test never asserted the URL path. Compatibility: live DB gets `data` via runtime ALTER; no Media rows created for ads; dashboard unchanged (absolute videoUrl both paths). Remaining risk: DB-fallback blobs still burn Neon on view (accepted; R2 is the advised path — M-video covers Range support). Verified 2026-08-25. |
| C2 | Critical | api-config drops MOMO_/ELEVENLABS_/STORAGE_ keys | VERIFIED | api/src/routes/api-config.ts (ALL_KEYS +14 keys with rationale comments) | 4 new tests: PUT round-trip of all 14 keys, GET returns them + allowlist filter includes them, unknown key still rejected, RETAILER role 403 | tsc clean; full suite 71/71 | Root cause: hardcoded ALL_KEYS allowlist (drives both GET filter and PUT filter) predated the Ad Studio/MoMo/Storage dashboard fields. Dashboard `save()` writes `<PREFIX>_ENABLED` toggles via /settings (separate endpoint) — unaffected. Remaining risk: none for this finding; secrets still returned unmasked by GET (that is H9, tracked separately). Verified 2026-08-25. |
| C4 | Critical | Subscription replay / non-transactional confirm | NOT STARTED | — | — | — | — |
| C5 | Critical | OAuth tokens in query params | NOT STARTED | — | — | — | — |
| C3 | Critical | No baseline migration | NOT STARTED | — | — | — | — |
| H1 | High | Enforcer 'system' FK + partial failure | NOT STARTED | — | — | — | — |
| H2 | High | Callback audit loss ('system' logActivity) | NOT STARTED | — | — | — | — |
| H3 | High | #token= fixation, parsed during render | NOT STARTED | — | — | — | — |
| H4 | High | Refresh always-on + no single-flight | NOT STARTED | — | — | — | — |
| H5 | High | Subscription guard fail-open | NOT STARTED | — | — | — | — |
| H6 | High | Media base64 N+1 (no select) | NOT STARTED | — | — | — | — |
| H7 | High | Mirror staleness / non-atomic restore | NOT STARTED | — | — | — | — |
| H8 | High | Backups unbounded in settings row | NOT STARTED | — | — | — | — |
| H9 | High | GET /settings returns secrets unmasked | NOT STARTED | — | — | — | — |
| H10 | High | Dockerfile.api broken (npm ci + build order) | NOT STARTED | — | — | — | — |
| H11 | High | Store theme leak (no unmount cleanup) | NOT STARTED | — | — | — | — |
| H12 | High | Cross-store cart contamination | NOT STARTED | — | — | — | — |
| H13 | High | Silent money-action failures (orders page) | NOT STARTED | — | — | — | — |
| H14 | High | Missing FK/hot-path indexes | NOT STARTED | — | — | — | — |
| M-money | Medium | Float money; Payment.currency default USD | NOT STARTED | — | — | — | — |
| M-killswitch | Medium | Kill-switch fail-open on missing table | NOT STARTED | — | — | — | — |
| M-mirror | Medium | Mirror dump single-row + unsafe exec | NOT STARTED | — | — | — | — |
| M-prune | Medium | No pruning (analytics/logs/notifications/sessions) | NOT STARTED | — | — | — | — |
| M-csp | Medium | CSP unsafe-inline + localStorage JWTs | NOT STARTED | — | — | — | — |
| M-video | Medium | No Range support; buffered MP4; public docs | NOT STARTED | — | — | — | — |
| M-sigterm | Medium | No SIGTERM handler; stuck RENDERING rows | NOT STARTED | — | — | — | — |
| M-ssrf | Medium | Ads captureUrl SSRF; batch unbounded | NOT STARTED | — | — | — | — |
| M-timing | Medium | Flutterwave compare not timing-safe | NOT STARTED | — | — | — | — |
| M-deps | Medium | prisma CLI/client mismatch; multer 1.x; tsx prod | NOT STARTED | — | — | — | — |
| M-authmodels | Medium | 3 divergent auth trust models | NOT STARTED | — | — | — | — |
| M-categories | Medium | Categories GET performs writes | NOT STARTED | — | — | — | — |
| M-img | Medium | Image remotePatterns mismatch | NOT STARTED | — | — | — | — |
| M-grid | Medium | minmax(400px) overflow on settings pages | NOT STARTED | — | — | — | — |
| L-magicidx | Low | magic_link_tokens email index missing in migrations | NOT STARTED | — | — | — | — |
| L-verified | Low | isVerifiedPurchase always true | NOT STARTED | — | — | — | — |
| L-wishlist | Low | Wishlist ignores real product images | NOT STARTED | — | — | — | — |
| L-membersince | Low | Member Since shows today | NOT STARTED | — | — | — | — |
| L-urlenc | Low | Search query not URL-encoded | NOT STARTED | — | — | — | — |
| L-slug | Low | Slug check per keystroke, no abort | NOT STARTED | — | — | — | — |
| L-dates | Low | Date format drift | NOT STARTED | — | — | — | — |
| L-ann | Low | Announcements unbounded growth | NOT STARTED | — | — | — | — |
| L-role | Low | Role-mismatch → /login instead of no-access | NOT STARTED | — | — | — | — |

---

## Remediation log (chronological)

- **Program started** — reference files created. No code changed yet.
