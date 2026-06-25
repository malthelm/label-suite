# Label Suite — Follow-up Task: Fix delete cascades + hardening

The full-CRUD work (commit `a62d7af`) is good and live, but the DELETE handlers leave foreign-key children behind, which causes opaque 500 errors in production. Fix these before starting new features. Work in `src/pages/api/`. After changes: `npx astro check` (0 errors) and `npm run build`, then commit + Docker rebuild + redeploy.

Context — the FK graph (from `src/db/schema.ts`), children that reference each parent:
- `releases.id` ← `tracks.release_id`, `budget_line_items.release_id`, `dsp_pitches.release_id`, `calls.release_id`
- `artists.id` ← `releases.artist_id`
- `works.id` ← `tracks.work_id`, `roles.work_id`
- `contacts.id` ← `artists.contact_id`, `roles.contact_id`, `calls.contact_id`

## Task 1 — Fix Release DELETE (`src/pages/api/releases.ts`)

Currently it deletes `tracks` and the release, but not `budget_line_items`, `dsp_pitches`, or `calls` that reference the release → FK violation when any exist.

- Before deleting the release, delete (or detach) ALL child rows that FK to it: `tracks`, `budget_line_items`, `dsp_pitches`, `calls`. For `calls`, deleting the call may be too aggressive (a call can matter independently) — prefer setting `calls.release_id = null` rather than deleting the call. Use your judgment but document the choice in a comment.
- Wrap the multi-step delete in a transaction (`db.transaction(...)`) so a mid-way failure doesn't leave the DB half-deleted.
- Add an existence check: if no release matches the id, return 404 (match the pattern already in `tracks.ts` DELETE).
- Do NOT delete the `works` linked by those tracks — works are shared, persistent identities and may be reused by other releases.

## Task 2 — Fix Artist DELETE (`src/pages/api/artists.ts`)

Deleting an artist that has releases → FK violation. Decide the policy and implement it:
- **Recommended:** block the delete if the artist still has releases. Return `409 Conflict` with a clear message like `"Cannot delete artist with N releases — reassign or delete those releases first."` This is safest (no silent data loss).
- Alternative: detach by setting `releases.artist_id = null` for that artist, then delete. Only do this if you'd rather allow it.
- Add the same 404-on-missing-id check.

Whichever you pick, the UI delete button should surface the error message (it currently `alert()`s `data.error`, so just make sure the endpoint returns a helpful `error` string and a non-200 status).

## Task 3 — Small hardening

- Artist `PUT`: validate `name` the same way `POST` does — reject empty/whitespace-only with 400. Right now `PUT` will happily blank out a name.
- Release/Artist DELETE: add the existence check so they 404 instead of silently returning 200 for an unknown id (consistency with `tracks.ts`).
- Confirm the middleware actually gates `/api/*` mutation routes (it should require a session for everything except `/`, `/login`, `/signup`, `/api/auth/*`, `/api/health`). If an unauthenticated `fetch` to `/api/releases` currently gets a 302 redirect to `/login` instead of a 401, that's acceptable but note it.

## Verification (required)

1. `npx astro check` → 0 errors; `npm run build` → success.
2. Manual: create a release, add a budget line item to it (or a DSP pitch), then delete the release → it succeeds (no 500) and the budget line is gone too.
3. Manual: create an artist with one release, try to delete the artist → you get the friendly 409 message (or the detach behavior if you chose that), not a raw 500.
4. Edit an artist and try to clear the name → rejected with 400.
5. Report which cascade policy you chose for releases (calls deleted vs detached) and for artists (block vs detach).
