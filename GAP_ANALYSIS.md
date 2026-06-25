# Label Suite — Gap Analysis: SaaS vs Airtable v3 base

Date: 2026-06-25
SaaS: Astro 7 + Postgres (`label_suite` schema), 12 tables, live at label-suite.truenature.online
Airtable v3 (source of truth): base `appoKM3ylTDhR60LY`, **34 tables**

## TL;DR

The SaaS has faithfully rebuilt the **operational core** — the readiness/clearance spine (artists → releases → tracks → works → rights) plus today-hub, budget basics, DSP pitches, and the auto-bug inbox. That's the hard part and it's largely done.

What stands between it and "usable SaaS that replaces Airtable" is three things:
1. **Two flattened models** inside tables we already have (clearance rights, and per-bucket release budgets) that don't yet match how you actually track them.
2. **Whole adjacent domains** that aren't modeled at all (royalties/revenue, campaigns + radio promo, ops tasks, grants/funding, media assets, artist-metrics history, documents).
3. **Real data** — the SaaS is an empty shell until v3 is migrated in (the `seed_airtable.py` script is the start of this).

## Table-by-table mapping

| Airtable v3 table | SaaS status | Notes |
|---|---|---|
| Contacts | ✅ Covered (partial) | SaaS missing: CVR, publisher info, legal name, splits links |
| Artists | 🟡 Partial | SaaS has Spotify + IG/TikTok handles; missing YouTube/Soundcharts, genres, priority, team, image, metrics history |
| Releases (And Artist Events) | 🟡 Partial | Core fields ✅; missing per-bucket budgets, catalog number, focus track, "why blocked", delivery/exploitation status detail, events |
| Release Tracks | 🟡 Partial | Core ✅; missing pub/master share split, entered-vs-confirmed, rights progress |
| Recordings (Masters) | 🟡 = `works` | SaaS `works` conflates master + composition (see fidelity gap) |
| Compositions (Works) | ❌ Missing as distinct | ISWC/publishing side folded into `works.iswc`; not a separate entity |
| Rights Lines (Roles) | 🟡 Partial | SaaS `roles` has single share + status; Airtable splits pub vs master, entered vs confirmed, fee, weight |
| ISRC Sequences | ✅ Covered | Matches |
| Budget Line Items | ✅ Covered | Matches (flat) |
| Budget Categories | ✅ Covered | Has bucket/type |
| DSP Pitches | ✅ Covered | Matches |
| Calls | ✅ Covered | Today-hub |
| Bugs | ✅ Covered | Auto-bug inbox + bug_key dedup |
| Royalties / Revenue | ❌ Missing | The money side — statements, gross/net, paid-out, per artist/release |
| Sheet (royalty ingest) | ❌ Missing | Raw DSP earnings ingest feeding Royalties |
| Campaigns | ❌ Missing | Marketing campaigns, budget planned/actual, KPIs, AI risk flag |
| Radio Stations | ❌ Missing | Radio promo CRM |
| Campaign Stations | ❌ Missing | Campaign↔station join |
| Ops Tasks | ❌ Missing | General task mgmt (distinct from bugs/calls) — owner, due, overdue |
| Projects | ❌ Missing | Funding projects |
| Grants | ❌ Missing | Funding bodies + applications (KODA/Statens Kunstfond etc.) |
| Applications | ❌ Missing | Grant applications pipeline |
| Media Assets | ❌ Missing | Creative assets w/ approval + delivery status |
| Documents | ❌ Missing | Contracts/legal docs per release/artist/contact |
| Artist Metrics | ❌ Missing | Time-series social/streaming metrics (SaaS has only a single snapshot on `artists`) |
| Side Artists | ❌ Missing | Featured/side-artist credits |
| Reporting / Reporting Weeks | ❌ Missing | Release reporting cadence |
| Personal Writings | ⚪ Skip | Personal, not core SaaS |
| Assets / Implementation Log / Schema Snapshots / RUNS | ⚪ Skip | Airtable-automation scaffolding; the SaaS replaces these with its own code + git, not data tables |

## The two fidelity gaps that matter most

### 1. Clearance: publishing vs master, entered vs confirmed
Airtable's `Rights Lines (Roles)` tracks **two separate clearance universes** per work — Publishing share and Master share — and each has an **entered** value and a **confirmed** value, plus a clearance weight and a fee. A work is only truly cleared when *both* the publishing side and the master side reach 100% confirmed.

The SaaS `roles` table has a single `percent_share` + `clearance_status` and a `scope` field (Publishing/Master/Mechanical), but `computeClearanceProgress()` blends **all** roles into one weighted ratio. That means a work can read "100% cleared" with full publishing but zero master (or vice-versa). For the product whose whole point is trustworthy readiness, this is the highest-value correctness gap to close.

### 2. Release budgets are per-bucket in Airtable, flat in the SaaS
Airtable's Releases carry Marketing / A&R / Digital / Publicity each as **budget vs actual**, with rollups. The SaaS has a generic `budget_line_items` + `budget_categories` but the release view doesn't show the bucketed budget-vs-actual picture the Manager overview relies on.

## What "usable SaaS" needs — suggested phases

**Phase A — Make the core trustworthy + populated (do first)**
- Fix the clearance model to separate publishing vs master (and ideally entered vs confirmed), so readiness matches reality.
- Migrate v3 data in (finish `seed_airtable.py`): contacts, artists, releases, tracks, works, roles, budgets, calls, pitches. Without data it can't be daily-driven.
- Surface per-bucket budget vs actual on the release view.

**Phase B — Close the daily-ops loop**
- Ops Tasks (owner, due date, overdue) — the general to-do layer the today-hub is missing.
- Campaigns + Radio Stations + Campaign Stations — promo workflow.
- Media Assets + Documents — creative approval + contract storage.

**Phase C — The money + growth side**
- Royalties / Revenue + the raw earnings ingest (Sheet) — statements, net revenue, paid-out tracking, per artist/release.
- Artist Metrics history + Spotify/Soundcharts fetch (the v3 base clearly automated this).
- Grants / Projects / Applications — funding pipeline.

**Phase D — Reporting & polish**
- Reporting weeks/cadence, side artists, dashboards over the now-real data.

## Notes
- The v3 base is heavily agent-operated (Implementation Log, RUNS, Schema Snapshots, Bug auto-triage). The SaaS already replaces that machinery with code + the validation sweep + git history, so those four tables should NOT be ported as data — they were Airtable's substitute for having a real backend.
- `works` should likely be split into Masters (ISRC, audio, master rights) and Compositions (ISWC, publishing rights) to match the rights model in fidelity-gap #1.
