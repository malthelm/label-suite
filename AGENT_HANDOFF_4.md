# Label Suite — Follow-up Task: Works/Tracks auto-link + ISRC consistency

Goal: guarantee every track is backed by a `work`, so it can always be cleared. Clearance (and therefore readiness) lives on the **work** via `roles` — a track with `work_id = null` can never reach "Ready," silently. Right now `POST /api/tracks` only links a work if the caller passes `work_id` (existing) or `new_work_title` (create). If they pass neither, the track is created orphaned.

Work in `src/pages/api/tracks.ts` and `src/components/tracks/TrackForm.tsx`. After changes: `npx astro check` (0 errors), `npm run build`, then commit + Docker rebuild + redeploy.

## Task 1 — Auto-create a work when none is specified (`tracks.ts` POST)

When neither `work_id` nor `new_work_title` is provided, auto-create a work from the track's own title and link it, so no track is ever orphaned.

- If `work_id` given → link to it (existing behavior).
- Else if `new_work_title` given → create that work (existing behavior).
- Else (new) → create a work with `title = <track title>` and link the track to it.
- Optional but nice: dedupe — if a work with the same normalized title already exists, link to it instead of creating a duplicate. If you do this, keep it simple (exact case-insensitive title match) and comment it.

## Task 2 — Fix ISRC duplication (do this in the same pass)

There's a latent bug today: when creating a track with a new work, the code generates an ISRC for the **work** and then **separately** generates another ISRC for the **track** — so `work.isrc` and `track.isrc` end up different. An ISRC identifies a recording, which is the work's identity; the track should inherit the work's ISRC, not mint its own.

- The ISRC should be generated **once**, on the work.
- The track's `isrc` should inherit the linked work's ISRC (whether the work is existing, newly-created-by-title, or auto-created). Only fall back to generating one if the work genuinely has no ISRC and `auto_isrc` is set — and if you generate it, write it to the work too, so they stay in sync.
- When linking to an **existing** work, the track should adopt that work's `isrc` (and ideally `audio_url`/`duration` if the track doesn't override them), rather than generating fresh values.

## Task 3 — TrackForm UX (`TrackForm.tsx`)

The form currently forces an explicit choice between "Link to existing work" and "Create new work." Add a third, default path so the common case is one step:

- Default behavior when the user doesn't engage the work selector: auto-use the track title as the work (sends neither `work_id` nor `new_work_title`, letting Task 1 handle it). Make the existing two modes still available for power users.
- Show a small hint near the work selector, e.g. "Leave blank to create a work from the track title."
- Keep `auto_isrc` behavior, but it now applies to the work's ISRC (Task 2), which the track inherits.

## Task 4 — Confirm readiness still recomputes

After any track create/edit, `persistTrackReadiness(trackId)` and `persistReleaseReadiness(release_id)` must run (they already do — just confirm the new auto-create path doesn't skip them). The point of this whole task is that a freshly-created track is now clearable, so verify the clearance/readiness chain reaches it.

## Verification (required)

1. `npx astro check` → 0 errors; `npm run build` → success.
2. Create a track with NO work selected → confirm a work row was created with the track's title, the track's `work_id` is set, and `work.isrc === track.isrc`.
3. Create a track linked to an EXISTING work that has an ISRC → confirm the track adopts that work's ISRC (no new ISRC minted).
4. Add a role on that work and mark it Signed → confirm the track's `clearance_progress` rises and its badge moves toward Ready (end-to-end proof the auto-linked work is clearable).
5. Report whether you implemented title dedup, and confirm no track can be created with `work_id = null`.
