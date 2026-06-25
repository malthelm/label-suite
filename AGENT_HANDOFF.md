# Label Suite — Remediation Task for Implementing Agent

You are working in the `label-suite` repo (Astro 7 + React 19 + Supabase Postgres + Better Auth + Drizzle). A review found that the UI shell, DB schema, and read-only pages exist, but the core of the SaaS — SSR, auth, and the readiness engine — is off, stubbed, or disconnected. The app currently builds as a **static site**, so all data is frozen at build time, no routes are protected, and there is no API layer.

Your job is to bring the implementation in line with `SPEC.md`. Read `SPEC.md` and `src/db/schema.ts` first. Work in the priority order below. Do not skip the security task. After each phase, run `npx astro check` and `npm run build` and fix all errors before moving on.

## Ground rules

- Consult the docs in `AGENTS.md` / `CLAUDE.md` before touching routing, components, or middleware.
- Start the dev server in background mode: `astro dev --background` (manage with `astro dev stop|status|logs`).
- Pick ONE data layer and use it everywhere (see Task 5). Do not leave two parallel ones.
- Every server endpoint and page that reads live data must run per-request, not at build time.
- Persist computed fields back to the DB; pages render off stored columns (`release_ready`, `release_missing`, `track_ready`, `clearance_progress`), so something must write them.
- Keep secrets out of source. No hardcoded connection strings, no committed credential files.

---

## Task 1 — Rotate and remove the leaked credential (do this first)

`.dburl` is committed to git (since commit `f279589`) and contains a live Postgres connection string with credentials for `label_suite_app@100.92.149.28`.

1. Rotate the `label_suite_app` Postgres password immediately (out of band — tell me what to run if you can't).
2. `git rm --cached .dburl` and add `.dburl` to `.gitignore`.
3. In `src/lib/auth.ts`, remove the hardcoded fallback connection string. Require `DATABASE_URL` from env and throw a clear error if it's missing — never fall back to an embedded secret.
4. Grep the repo for any other inline credentials or hosts and remove them.

Deliverable: no credentials anywhere in tracked files; the app fails loudly when env vars are absent.

## Task 2 — Switch to SSR (server output + Node adapter)

Currently `astro.config.mjs` has `output: 'static'` with no adapter. Pages run `await supabase.from(...)` at the top level, which executes at build time. This must run per request.

1. `npm install @astrojs/node`.
2. Set `output: 'server'` and `adapter: node({ mode: 'standalone' })` in `astro.config.mjs`.
3. Add `export const prerender = true` to the marketing landing page (`src/pages/index.astro`) only. Everything else stays SSR.
4. Build and confirm `dist/server/entry.mjs` exists.
5. Verify the dashboard now reflects live DB changes without a rebuild.

## Task 3 — Wire up auth (Better Auth + middleware + API handler)

`lib/auth.ts` is configured but never mounted. `middleware.ts` is a permissive no-op, so every route is public. There is no `src/pages/api/` directory at all.

1. Create `src/pages/api/auth/[...all].ts` that forwards requests to the Better Auth handler. Confirm it works only after Task 2 (static builds have no server routes).
2. Replace `src/middleware.ts` with real protection: read the session; redirect unauthenticated requests for app routes (`/dashboard`, `/artists/*`, `/releases/*`, `/today`, `/budget`, `/works/*`) to `/login`. Leave `/`, `/login`, `/signup`, and `/api/auth/*` public.
3. Wire `LoginForm.tsx` and `SignupForm.tsx` to the Better Auth client so sign-up, sign-in, and sign-out actually complete a session round-trip.
4. Confirm the auth tables exist in the `label_suite` schema (users, sessions, etc.); generate/run a migration if not.

Deliverable: signing up creates a user, signing in sets a session cookie, protected routes redirect when logged out, sign-out clears the session.

## Task 4 — Fix and complete the readiness engine

`src/lib/readiness.ts` has a broken import and disconnected logic.

1. Remove the broken `import type { components } from "./db/schema"` (wrong path, not exported). Fix or delete any dependents.
2. Make clearance real: `computeClearanceProgress(workId)` derives progress from roles, but nothing writes it to `tracks.clearance_progress`. Add a step that computes and **persists** it whenever roles change (or as part of the sweep). Track readiness currently reads a cached value that is never updated.
3. Persist release readiness: `computeReleaseReadiness` recomputes but never writes `release_ready` / `release_missing`. The dashboard and releases list render off those stored columns, so write them back.
4. Create `src/lib/clearance.ts` and `src/lib/validation.ts` as called for in the spec (Phase 3), or consolidate the logic clearly into `readiness.ts` and update the spec to match — but don't leave the spec referencing files that don't exist.
5. Make the validation sweep self-healing: `runValidationSweep` upserts bugs by `bug_key` (no dupes — good) but never closes a bug when the underlying issue is fixed. After computing current issues, close (`status: done`) any auto-generated bug whose condition no longer holds.
6. Add `src/pages/api/sweep.ts` to trigger the sweep, and a `BugInbox` component for triage (spec Phase 3.3 / 4.1).

## Task 5 — Resolve the dual data-layer problem

There are two disconnected data layers: a full Drizzle schema in `src/db/schema.ts` (the spec's intended ORM) that nothing queries through, and the Supabase JS client (PostgREST) that every page actually uses. Better Auth uses the raw `pg` Pool.

Decide and execute one of:
- **Standardize on Drizzle + `pg`** (matches the spec and Better Auth's pool): migrate page queries off the Supabase REST client, then delete `src/lib/supabase.ts` and the Supabase JS dependency.
- **Standardize on Supabase REST**: delete the unused Drizzle schema/config and update `SPEC.md` to reflect reality.

State which you chose and why, then make the codebase internally consistent. No dead data layer should remain.

## Task 6 — Fill the missing CRUD and pages

Per `SPEC.md`, these are missing or non-functional:

- `ArtistForm` / `ReleaseForm` exist but are referenced nowhere — wire create/edit (Dialog) into the list/detail pages.
- `releases/index.astro` links to `/releases/new`, which 404s. Add the route or change the flow to a create dialog.
- Tracks pages + `TrackForm` + `WorkSelector` (Phase 2.3), including ISRC auto-generation via `lib/isrc.ts`.
- `works/[id]` detail with roles management (`RoleTable` / `RoleForm`, Phase 3.2).
- Budget page components and form (Phase 4.3).
- Today hub components: `CallList`, `BlockedReleases`, `BugInbox` (Phase 4.1).
- Dashboard pipeline + stats components (Phase 4.2).
- Delete the leftover `src/pages/test.astro` scaffold.

## Verification (required before you report done)

1. `npx astro check` passes with zero errors. (Note: the review machine couldn't run this in a Linux sandbox because `node_modules` was built for arm64-darwin and `rolldown`'s native binding wouldn't load — run it on the real dev machine.)
2. `npm run build` succeeds and produces `dist/server/entry.mjs`.
3. Manual smoke test: sign up → sign in → protected route redirect works when logged out → create an artist and a release → readiness badge reflects actual computed state → run the sweep → fix an issue → confirm the corresponding bug auto-closes on the next sweep.
4. `git grep` confirms no credentials in tracked files.
5. Report a short summary of what changed per task, the data-layer decision you made, and anything in `SPEC.md` you updated to match reality.
