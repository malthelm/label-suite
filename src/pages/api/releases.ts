import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { releases, tracks } from "../../db/schema";
import { eq } from "drizzle-orm";
import { persistReleaseReadiness } from "../../lib/readiness";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const id = body.id || crypto.randomUUID();
    await db.insert(releases).values({
      id,
      title: body.title.trim(),
      artist_id: body.artist_id || null,
      release_date: body.release_date || null,
      format: body.format || "single",
      upc_ean: body.upc_ean || null,
      cover_art_url: body.cover_art_url || null,
      status: body.status || "draft",
    }).onConflictDoNothing();

    // Persist readiness for the new release
    await persistReleaseReadiness(id);

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
    for (const field of ["title", "artist_id", "release_date", "format", "upc_ean", "cover_art_url", "status", "delivery_status", "exploitation_scope", "notes"]) {
      if (body[field] !== undefined) updates[field] = body[field] || null;
    }

    await db.update(releases).set(updates).where(eq(releases.id, body.id));

    // Re-persist readiness since release fields (UPC, cover art, date) may have changed
    await persistReleaseReadiness(body.id);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    // Also delete dependent tracks to keep DB clean (cascading would be nicer, but no FK cascade configured)
    await db.delete(tracks).where(eq(tracks.release_id, body.id));
    await db.delete(releases).where(eq(releases.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
