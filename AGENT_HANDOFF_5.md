# Label Suite — Follow-up Task: Publishing/Master clearance split (readiness fidelity)

## Why
The whole value of Label Suite is trustworthy readiness. Right now `computeClearanceProgress()` in `src/lib/readiness.ts` blends **all** roles of a work into one weighted ratio. But in the real model (Airtable v3 `Rights Lines (Roles)`, base `appoKM3ylTDhR60LY`), clearance has **two independent universes** — **Publishing** and **Master** — and a work is only cleared when *both* are satisfied. Today a work can read "100% cleared" with full publishing and zero master. This task fixes that.

## The real model (confirmed from the v3 base)
Each rights line (role) has:
- **Scope**: `Publishing` or `Master` (a line belongs to one universe). `Mechanical` exists but treat it as Publishing unless told otherwise.
- **Ownership Type**: `Rights` or `Credit`. **Only `Rights` lines count toward clearance.** `Credit` lines are credits-only (name in the booklet, no ownership) and must be excluded from all clearance math.
- **% Share**: the share entered for that line (e.g. 30).
- **Clearance Status** → weight: `Signed` = 1.0, `Confirmed` = 0.75, `Pending` = 0.25, `Unknown`/blank = 0. (Same weights already in the code.)

Per scope, the v3 base tracks two measures (mirror these names so it's recognizable):
- **Entered total** = sum of `% Share` across the scope's `Rights` lines. A healthy universe sums to ~100%.
- **Weighted/confirmed total** = sum of `% Share × weight` across the scope's `Rights` lines.

A scope is **cleared** when its weighted total reaches its entered total *and* the entered total is ~100% (i.e. every share is accounted for and signed/confirmed). A work/track is **cleared** only when **every scope that has any Rights lines is cleared** — i.e. Publishing cleared **AND** Master cleared.

Your schema already supports this: `roles.scope` and `roles.ownership_type` exist. This is primarily a **computation + display** change, not a migration.

## Task 1 — Rewrite the clearance computation (`src/lib/readiness.ts`)
Replace the single blended `computeClearanceProgress(workId)` with a per-scope computation. Suggested shape:

```ts
type ScopeClearance = {
  enteredTotal: number;     // sum of % share (Rights lines only)
  weightedTotal: number;    // sum of % share × statusWeight
  progress: number;         // weightedTotal / 100  (0..1)
  cleared: boolean;         // progress >= 1.0 (all shares signed/confirmed, summing to 100)
};
// returns { publishing: ScopeClearance, master: ScopeClearance, overall: number, cleared: boolean }
```

Rules:
- Exclude `ownership_type = 'Credit'` lines entirely.
- Compute Publishing and Master independently. `Mechanical` rolls into Publishing.
- A scope with **no Rights lines** is "not applicable" — it should NOT block clearance (don't require a master universe if no master rights were entered). But a work with zero Rights lines anywhere is `cleared = false` (nothing to clear means not cleared, matching today's "No roles → 0").
- `overall` progress (for the 0–100% badge) = the **minimum** of the applicable scopes' progress (so the badge reflects the weakest universe, not an average that hides a gap).
- `cleared` = every applicable scope is cleared.

Keep `percent_share` scale as-is (0–100). Document the threshold choice in a comment.

## Task 2 — Persist per-scope results
`tracks.clearance_progress` (single real) is no longer enough to tell the pub vs master story. Add cached columns so pages don't recompute:
- Add to `tracks`: `clearance_pub` (real), `clearance_master` (real), keep `clearance_progress` as the overall min.
- Generate a Drizzle migration for the new columns (`drizzle-kit generate`), and make sure it applies to the live DB.
- Update `persistClearanceProgress(workId)` (and `persistAfterRoleChange`) to write all three, then re-run track + release readiness as today.
- Track readiness gate stays: ISRC present AND audio present AND `cleared` (both universes) — so wire the gate to the new `cleared`, not to `clearance_progress >= 1`.

## Task 3 — Surface it in the UI
- **RoleManager / RoleForm** (`src/components/roles/`): the form already has Scope and Ownership. Make sure Ownership defaults sensibly and that the list visibly groups or labels Publishing vs Master, and shows whether a line counts as clearance (Rights) or is credit-only.
- **Work detail** (`works/[id].astro`): show two progress indicators — Publishing % and Master % — plus entered-total sanity (e.g. warn if a universe's entered shares don't sum to ~100%, matching the v3 "Clearance Universe" check).
- **Track / release readiness badges**: when "Not Ready" due to clearance, the missing reason should say which side (e.g. `Master clearance 75%` or `Publishing shares only sum to 80%`), not a generic "Clearance".

## Decision to make and document — split `works` into Masters vs Compositions?
The v3 base splits this into two tables: **Recordings (Masters)** (ISRC, audio, master rights) and **Compositions (Works)** (ISWC, publishing rights). The SaaS folds both into one `works` table (`isrc` + `iswc` on one row).

**Recommendation: do NOT split now.** The Publishing/Master clearance split above is achieved purely via `roles.scope`, so you get correct readiness without restructuring `works`. Splitting is only worth it if you need one composition shared across multiple master recordings (covers, re-records, alternate masters) — which is a deeper refactor (new table, FK rewrites, migration of existing tracks). Defer it to its own task unless you already have that need. **State in your report whether you deferred or split, and why.**

## Verification (required)
1. `npx astro check` → 0 errors; `npm run build` → success; migration applies cleanly.
2. Create a work with: Publishing rights summing to 100% all `Signed`, but Master rights only 50% `Confirmed`. → Work shows Publishing 100% / Master ~38%, overall badge reflects the **master** gap, and the track does **not** reach Ready. Today's blended code would wrongly show it much closer to ready.
3. Add the remaining master rights as `Signed` to reach 100%. → Both universes cleared, track flips to Ready (assuming ISRC + audio present), release readiness recomputes.
4. Add a `Credit` (ownership_type=Credit) line with a % share → confirm it does NOT change any clearance number.
5. Report the threshold/rounding choices, the per-scope columns added, and the works-split decision.

Sources: v3 base https://airtable.com/appoKM3ylTDhR60LY — tables `Rights Lines (Roles)`, `Release Tracks`, `Recordings (Masters)`, `Compositions (Works)`.
