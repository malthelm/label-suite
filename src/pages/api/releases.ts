import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { releases, tracks, budget_line_items, dsp_pitches, calls } from "../../db/schema";
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

    const id = body.id as string;

    // Existence check before transaction
    const rows = await db.select({ id: releases.id }).from(releases).where(eq(releases.id, id));
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "Release not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Multi-step delete in a transaction so a mid-way failure doesn't leave
    // the DB half-deleted.
    await db.transaction(async (tx) => {
      // Delete child rows (cascade manually — no FK cascade in schema).
      // Tracks: delete. Budget line items: delete. DSP pitches: delete.
      // Calls: detach (set release_id = null). A call may matter independently
      // and shouldn't be silently erased just because the release is gone.
      await tx.delete(tracks).where(eq(tracks.release_id, id));
      await tx.delete(budget_line_items).where(eq(budget_line_items.release_id, id));
      await tx.delete(dsp_pitches).where(eq(dsp_pitches.release_id, id));
      await tx.update(calls).set({ release_id: null }).where(eq(calls.release_id, id));

      // The release itself
      await tx.delete(releases).where(eq(releases.id, id));
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
