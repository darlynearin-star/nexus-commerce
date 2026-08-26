# Primary Database Swap: Neon → Supabase

One-time migration that makes Supabase the live primary and turns Neon into a
near-zero-cost dormant fallback. Kills the compute-hours ceiling permanently.

```
Before:  DATABASE_URL=Neon       DATABASE_URL_FALLBACK=Supabase
After:   DATABASE_URL=Supabase   DATABASE_URL_FALLBACK=Neon
```

All machinery (proxy failover, boot-time mirror, restore-if-empty, dashboard
switch) reads env vars and works identically inverted — no code changes.

---

## Pre-flight

- [ ] Supabase project created — region **Frankfurt** or **London** (lowest latency to Uganda)
- [ ] Copy TWO connection strings from Supabase → Project Settings → Database:
      - **Transaction pooler** (port `6543`, ends with `?pgbouncer=true`) — runtime
      - **Direct** (port `5432`) — migrations only
- [ ] Neon connection string still at hand (rollback)
- [ ] Low-traffic time of day chosen (fewer orders in-flight)

## Step 1 — Schema on Supabase (rows need tables)

Temporarily point the database package at Supabase's DIRECT url:

```powershell
# edit packages/database/.env → DATABASE_URL="<supabase-direct-5432-url>"
npm run db:push -w packages/database
# then RESTORE packages/database/.env to the Neon URL
```

## Step 2 — Force a fresh mirror snapshot

The mirror dumps Neon→Supabase only on boot **when data changed**. Guarantee
freshness: make any small write (save a store setting from the dev dashboard),
then restart the Render API service. Watch logs for:
`Mirrored current database snapshot to fallback`.

## Step 3 — Flip and populate (reversible dry-run)

Dev dashboard → database switch → **fallback** (or `POST /api/system/database/switch`
with `{"target":"fallback"}`). Boot logic sees Supabase empty (`users` = 0),
reads the snapshot stored there, and replays every table atomically.

## Step 4 — Verify before committing

- [ ] Storefront loads products, images, categories
- [ ] Place a REAL test order end-to-end
- [ ] Login works (sessions/users came across)
- [ ] Dev dashboard shows source `fallback`, no degraded warnings

## Step 5 — Make it permanent

On Render, swap the API service env vars:

| Var | New value |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** (6543, `?pgbouncer=true`) |
| `DATABASE_URL_FALLBACK` | Neon pooled URL |

Redeploy. `/api/system/database` should now report the Supabase host as primary.

## Step 6 — Hardening (recommended)

- Set `DB_MANUAL_SWITCH=false`: if Supabase ever pauses or errors, requests
  auto-fail-over to Neon instead of erroring
- Add a weekly uptime ping to the storefront homepage (any page view counts as
  Supabase activity and prevents the 7-day pause)

---

## Rollback

Swap the two env vars back and redeploy. Neon still holds all pre-swap data;
anything written to Supabase after the flip must be copied by hand — which is
why Step 4 verification matters before Step 5.

## Known trade-offs accepted

- Supabase free: no automated backups — the boot-time mirror into Neon IS the
  backup now (verify occasionally: Neon `settings.fallback_mirror.updatedAt`)
- Supabase free: 7-day-inactivity pause (mitigated above); 500MB cap
- No Neon-style branches for dev — use a second Supabase project if needed
