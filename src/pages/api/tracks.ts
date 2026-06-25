import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { tracks, works } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateISRC } from "../../lib/isrc";
import { persistTrackReadiness, persistReleaseReadiness } from "../../lib/readiness";

export const prerender = false;

/**
 * Resolve (or create) a work for a track and return its { id, isrc }.
 *
 * Priority:
 * 1. work_id given → link to that existing work
 * 2. new_work_title given → create a new work with that title
 * 3. Neither → auto-create a work from the track's own title,
 *    optionally deduping against an existing work with the same title.
 */
async function resolveWork(
  trackTitle: string,
  workId?: string | null,
  newWorkTitle?: string | null,
  autoIsrc?: boolean,
): Promise<{ id: string; isrc: string | null }> {
  if (workId) {
    // Link to existing work — adopt its ISRC
    const rows = await db.select({ id: works.id, isrc: works.isrc }).from(works).where(eq(works.id, workId));
    if (rows.length) return { id: rows[0].id, isrc: rows[0].isrc ?? null };
    // Work not found → fall through to create
  }

  if (!workId && newWorkTitle) {
    // Create a new work with explicit title
    const id = crypto.randomUUID();
    const isrc = autoIsrc ? await generateISRC() : null;
    await db.insert(works).values({ id, title: newWorkTitle.trim(), isrc });
    return { id, isrc };
  }

  // No work specified — auto-create from track title.
  // Simple title dedup: if a work with the same normalized title already
  // exists, link to it instead of creating a duplicate.
  const normalized = trackTitle.trim();
  const existing = await db.select({ id: works.id, isrc: works.isrc }).from(works).where(
    eq(works.title, normalized),
  );
  if (existing.length) {
    // Reuse existing work
    return { id: existing[0].id, isrc: existing[0].isrc ?? (autoIsrc ? await generateAndSetWorkIsrc(existing[0].id) : null) };
  }

  // Create a new work from the track title
  const id = crypto.randomUUID();
  const isrc = autoIsrc ? await generateISRC() : null;
  await db.insert(works).values({ id, title: normalized, isrc });
  return { id, isrc };
}

/** Generate an ISRC and write it to the work. Returns the ISRC. */
async function generateAndSetWorkIsrc(workId: string): Promise<string> {
  const isrc = await generateISRC();
  await db.update(works).set({ isrc }).where(eq(works.id, workId));
  return isrc;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== "string") {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!body.release_id) {
      return new Response(JSON.stringify({ error: "Release ID is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const trackTitle = body.title.trim();
    const releaseId = body.release_id as string;

    // Resolve the work (auto-creates from track title if needed)
    const work = await resolveWork(
      trackTitle,
      body.work_id || null,
      body.new_work_title || null,
      body.auto_isrc === true || body.auto_isrc === undefined,
    );

    // Track ISRC inherits from work. Only mint a track-level ISRC if
    // the caller explicitly passed one. The work ISRC is the canonical one.
    const trackIsrc = body.isrc || work.isrc;

    // For audio_url and duration: adopt from existing work if track doesn't
    // provide its own.
    let audioUrl = body.audio_url || null;
    let duration = body.duration ? Number(body.duration) : null;
    if (work.id && (!audioUrl || !duration)) {
      const workRow = (await db.select({ audio_url: works.audio_url, duration: works.duration }).from(works).where(eq(works.id, work.id)))[0];
      if (!audioUrl && workRow?.audio_url) audioUrl = workRow.audio_url;
      if (!duration && workRow?.duration) duration = workRow.duration;
    }

    const id = crypto.randomUUID();
    await db.insert(tracks).values({
      id,
      title: trackTitle,
      release_id: releaseId,
      work_id: work.id,
      position: body.position ? Number(body.position) : null,
      version: body.version || "Main",
      isrc: trackIsrc,
      audio_url: audioUrl,
      duration,
    });

    // Persist readiness
    await persistTrackReadiness(id);
    await persistReleaseReadiness(releaseId);

    return new Response(JSON.stringify({ id, work_id: work.id, work_isrc: work.isrc, ok: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    for (const field of ["title", "position", "version", "isrc", "audio_url", "duration", "work_id"]) {
      if (body[field] !== undefined) updates[field] = body[field] || null;
    }

    // If user is changing the work_id, also adopt the new work's ISRC
    // so the track stays in sync with its canonical work.
    if (body.work_id && body.work_id !== (await getTrackWorkId(body.id))) {
      const workRows = await db.select({ isrc: works.isrc }).from(works).where(eq(works.id, body.work_id));
      if (workRows[0]?.isrc) {
        updates.isrc = workRows[0].isrc;
      }
    }

    await db.update(tracks).set(updates).where(eq(tracks.id, body.id));

    // Persist readiness
    await persistTrackReadiness(body.id);
    const trackRows = await db.select().from(tracks).where(eq(tracks.id, body.id));
    if (trackRows[0]?.release_id) {
      await persistReleaseReadiness(trackRows[0].release_id);
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

async function getTrackWorkId(trackId: string): Promise<string | null> {
  const rows = await db.select({ work_id: tracks.work_id }).from(tracks).where(eq(tracks.id, trackId));
  return rows[0]?.work_id ?? null;
}

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const existing = (await db.select().from(tracks).where(eq(tracks.id, body.id)))[0];
    if (!existing) {
      return new Response(JSON.stringify({ error: "Track not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    await db.delete(tracks).where(eq(tracks.id, body.id));
    if (existing.release_id) {
      await persistReleaseReadiness(existing.release_id);
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
