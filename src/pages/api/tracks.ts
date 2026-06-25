import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { tracks, works } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateISRC } from "../../lib/isrc";
import { persistTrackReadiness, persistReleaseReadiness } from "../../lib/readiness";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== "string") {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (!body.release_id) {
      return new Response(JSON.stringify({ error: "Release ID is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Handle work: link to existing or create new
    let workId = body.work_id || null;
    if (body.new_work_title) {
      workId = crypto.randomUUID();
      await db.insert(works).values({
        id: workId,
        title: body.new_work_title.trim(),
        isrc: body.auto_isrc ? await generateISRC() : null,
      });
    }

    const id = crypto.randomUUID();
    const isrc = body.isrc || (body.auto_isrc ? await generateISRC() : null);

    await db.insert(tracks).values({
      id,
      title: body.title.trim(),
      release_id: body.release_id,
      work_id: workId,
      position: body.position ? Number(body.position) : null,
      version: body.version || "Main",
      isrc,
      audio_url: body.audio_url || null,
      duration: body.duration ? Number(body.duration) : null,
    });

    // Persist readiness
    await persistTrackReadiness(id);
    await persistReleaseReadiness(body.release_id);
    if (workId) {
      // If we just created a work with ISRC, also persist work ISRC to track
    }

    return new Response(JSON.stringify({ id, ok: true }), { status: 201, headers: { "Content-Type": "application/json" } });
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
