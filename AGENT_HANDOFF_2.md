# Label Suite — Follow-up Task for Implementing Agent (Session 2)

The previous remediation (commit `425b546`) is solid: SSR is live, auth gates the app routes, the data layer is uniformly Drizzle, credentials are out of git, and the validation sweep is self-healing. A re-review confirmed all of that against the actual code.

But two real gaps remain, plus the feature work that was deferred. Work in the order below. Read `SPEC.md`, `src/lib/readiness.ts`, and `src/db/schema.ts` first. After each task, run `npx astro check` and `npm run build` and fix all errors before continuing. Start the dev server in background mode (`astro dev --background`).

---

## Task 1 — Wire up the readiness persistence (highest priority)

This is the one that makes the readiness engine actually do something. The functions `persistTrackReadiness`, `persistReleaseReadiness`, and `persistClearanceProgress` in `src/lib/readiness.ts` are correct but are **never called anywhere**. As a result `tracks.track_ready`, `tracks.clearance_progress`, and `releases.release_ready` / `release_missing` only ever hold their defaults — and the dashboard "Ready" count and the release/track badges render off those stored columns. Readiness is currently cosmetic.

Fix it on two fronts:

**1a. Make the sweep recompute and persist readiness.** In `runValidationSweep` (or a function it calls), after the bug pass, iterate every work and call `persistClearanceProgress(work.id)` (this also re-persists track readiness), then every release and call `persistReleaseReadiness(release.id)`. The sweep should leave the DB with fully up-to-date readiness columns. Return the counts you already return plus, optionally, how many releases/tracks were re-evaluated.

**1b. Persist on mutation.** Anywhere a track, role, or release is created or edited (the forms in Task 3, and any existing edit paths), call the relevant `persist*` function after the write so readiness updates immediately without waiting for a sweep:
- Track created/edited → `persistTrackReadiness(trackId)` then `persistReleaseReadiness(track.release_id)`.
- Role created/edited/deleted → `persistClearanceProgress(role.work_id)` then `persistReleaseReadiness` for any release whose track links to that work.
- Release fields (UPC, cover art, date) edited → `persistReleaseReadiness(releaseId)`.

Deliverable: after running the sweep (or editing any record), the dashboard and release/track badges reflect true computed state, not defaults.

## Task 2 — Fix the sweep's misleading `created` counter

In `runValidationSweep`, `created` increments on every upsert, including bugs that already existed (it's an upsert, not an insert). So the returned `created` is really "current open issues," not "newly created." Either:
- only count a bug as `created` when it was actually newly inserted (check whether the row existed first, or use an insert path that reports it), or
- rename the field to something honest like `openIssues` and add a separate true `created` count.

Update `src/pages/api/sweep.ts` and any caller/UI to match the new shape.

## Task 3 — Artist & Release create/edit forms

`ArtistForm` and `ReleaseForm` are referenced in `SPEC.md` but don't exist, and `releases/index.astro` links to `/releases/new` which 404s.

1. Build `src/components/artists/ArtistForm.tsx` and `src/components/releases/ReleaseForm.tsx` as shadcn Dialog forms (create + edit).
2. Add the API endpoints they POST to (e.g. `src/pages/api/artists.ts`, `src/pages/api/releases.ts`) using Drizzle. Validate input server-side.
3. Wire create/edit into the list and detail pages. Replace the broken `/releases/new` link with the create dialog (or add a real route — your call, just no 404).
4. Per Task 1b, call the relevant `persist*` after release writes.

## Task 4 — Tracks pages + Works selector (SPEC Phase 2.3)

1. `src/pages/releases/[id]/tracks.astro` — tracks for a release.
2. `src/components/tracks/TrackForm.tsx` and `src/components/tracks/WorkSelector.tsx` (link a track to an existing work or create a new one).
3. Auto-generate ISRC on track creation via `src/lib/isrc.ts` (it already exists — use it; it relies on the `isrc_sequences` table).
4. Per Task 1b, persist track + release readiness after track writes.

## Task 5 — BugInbox triage UI (SPEC Phase 3.3 / 4.1)

1. `src/components/BugInbox.tsx` — list open bugs sorted by priority (P0→P3), with status controls (logged → triaged → in_progress → done).
2. Surface it in the Today hub. Add an API endpoint to update bug status and a button to trigger the sweep (`POST /api/sweep`) and show the returned counts.

## Task 6 — Verify the Better Auth tables against a Drizzle migration

The auth tables (user, session, account, verification) exist in Postgres but should be represented in a Drizzle migration so the schema is reproducible.

1. Confirm `src/db/auth-schema.ts` matches what Better Auth actually expects/created.
2. Generate a Drizzle migration for the auth tables (`drizzle-kit generate`) and confirm it applies cleanly to a fresh DB.
3. Make sure `drizzle.config.ts` includes both the domain schema and the auth schema.

## Task 7 — Deploy the SSR build to Winona

1. Build (`npm run build` → `dist/server/entry.mjs`).
2. Run it as a service on Winona: `node dist/server/entry.mjs` under PM2 or systemd, with production env (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `PUBLIC_SITE_URL=https://label-suite.truenature.online`).
3. Caddy reverse proxy `label-suite.truenature.online` → `localhost:4321` (or whatever port the standalone server binds).
4. Add a `GET /api/health` endpoint returning `{ status: "ok" }` and confirm it responds through the tunnel.

## Verification (required before reporting done)

1. `npx astro check` → 0 errors; `npm run build` → success with `dist/server/entry.mjs`.
2. Readiness smoke test: create a release with a track missing ISRC → badge shows "Not Ready" with the right missing reason → add the ISRC and audio, set clearance roles to Signed → run sweep (or rely on mutation persist) → badge flips to "Ready" and the corresponding auto-bug auto-closes.
3. Sweep returns honest counts (newly-created vs. open vs. closed).
4. Create/edit flows work end-to-end for artists, releases, and tracks; no 404 on the create path.
5. `git grep` confirms no credentials in tracked files.
6. Report a short per-task summary, including the new sweep return shape and the deploy URL + health-check result.
