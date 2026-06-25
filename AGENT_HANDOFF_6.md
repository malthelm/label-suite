# Publishing/Master Clearance Split — Implementation Summary

## Decision: Do NOT split `works` into Masters/Compositions

We deliberately chose NOT to split the `works` table into separate Masters (Recordings) and Compositions tables. The Publishing/Master clearance split is achieved entirely via `roles.scope` — a role row already carries `scope: Publishing | Master | Mechanical`, so the computation separately accumulates Publishing (including Mechanical) vs Master universes without needing separate entity tables.

**Splitting is deferred** until a real requirement appears for one composition shared across multiple master recordings (e.g., covers, re-recordings, alternate masters). That would be a deeper refactor (new table, FK rewrites, migration of existing tracks) and has no practical benefit for the current single-Master-per-work model.

## New columns added to `tracks`

| Column | Type | Default | Purpose |
|---|---|---|---|
| `clearance_pub` | real | 0 | Publishing scope progress (0–1, may exceed 1 if overallocated) |
| `clearance_master` | real | 0 | Master scope progress (0–1) |
| `clearance_progress` | real | 0 | **Kept** as the minimum of applicable scopes' progress (the "overall" badge value) |

## `computeClearanceProgress` changes

The function now returns a `WorkClearance` object instead of a single number:

```ts
interface ScopeClearance {
  enteredTotal: number;   // sum of percent_share (Rights lines only)
  weightedTotal: number;  // sum of percent_share × statusWeight
  progress: number;       // weightedTotal / 100 (0..1)
  cleared: boolean;       // progress >= 1.0
}

interface WorkClearance {
  pub: ScopeClearance;
  master: ScopeClearance;
  overall: number;  // MIN of applicable scopes' progress
  cleared: boolean; // all applicable scopes cleared
}
```

Key rules:
- Rows with `ownership_type = 'Credit'` are **excluded** from all clearance math.
- `Mechanical` scope rolls into `Publishing`.
- A scope with **zero Rights lines** is "not applicable" — it does NOT block clearance (its progress is treated as 1.0).
- `overall` progress = minimum of applicable scopes' progress, so the badge reflects the weakest universe.
- `cleared` = all applicable scopes are cleared. If zero Rights lines exist across all scopes → `cleared = false`.

## Threshold / rounding

- `progress = weightedTotal / 100` (not `weightedTotal / enteredTotal`). This ensures that a scope is only cleared when shares sum to ~100% AND all shares have high clearance status.
- `cleared` check: `progress >= 1.0`. Overallocation (>100% shares) still counts as cleared.
- Progress values are rounded to 4 decimal places in computation; display rounds to integer percentage.

## Track readiness gate

`computeTrackReadiness` now reads the **stored** clearance columns (`clearance_pub`, `clearance_master`, `clearance_progress`) rather than recomputing from roles. This avoids redundant DB hits and keeps a clean separation:
1. `persistClearanceProgress` computes from roles → writes columns.
2. `persistTrackReadiness` reads stored columns → determines readiness.

Missing messages now say which scope is deficient:
- `Publishing clearance 80%`
- `Master clearance 50%`
- `Clearance required — no rights entered` (when work has roles but all are Credit)

## UI changes

**RoleManager**: Groups roles into Publishing Universe (blue dot) and Master Universe (amber dot), with visual headers. Credit lines show a "credit only" badge and hide the clearance status badge, replaced with "no clearance" label.

**RoleForm**: Added hint: "Credit lines are not counted in clearance calculations."

**works/[id].astro**: Each track row now shows two small progress bars (Publishing in blue, Master in amber) with their percentages, plus the overall badge.

**releases/[id].astro and releases/[id]/tracks.astro**: Each track shows "Pub X% · Mst Y%" below the track info when not ready.