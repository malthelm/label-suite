import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { artists, releases } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Name is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const id = body.id || crypto.randomUUID();
    await db.insert(artists).values({
      id,
      name: body.name.trim(),
      bio: body.bio || null,
      spotify_id: body.spotify_id || null,
      spotify_followers: body.spotify_followers ? Number(body.spotify_followers) : null,
      spotify_popularity: body.spotify_popularity ? Number(body.spotify_popularity) : null,
      pro: body.pro || null,
      ipi: body.ipi || null,
      instagram: body.instagram || null,
      tiktok: body.tiktok || null,
    }).onConflictDoNothing();

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

    // Validate name the same way POST does — reject empty/whitespace-only
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Name cannot be blank" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.bio !== undefined) updates.bio = body.bio || null;
    if (body.spotify_id !== undefined) updates.spotify_id = body.spotify_id || null;
    if (body.spotify_followers !== undefined) updates.spotify_followers = body.spotify_followers ? Number(body.spotify_followers) : null;
    if (body.spotify_popularity !== undefined) updates.spotify_popularity = body.spotify_popularity ? Number(body.spotify_popularity) : null;
    if (body.pro !== undefined) updates.pro = body.pro || null;
    if (body.ipi !== undefined) updates.ipi = body.ipi || null;
    if (body.instagram !== undefined) updates.instagram = body.instagram || null;
    if (body.tiktok !== undefined) updates.tiktok = body.tiktok || null;

    await db.update(artists).set(updates).where(eq(artists.id, body.id));
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

    // Existence check
    const rows = await db.select({ id: artists.id }).from(artists).where(eq(artists.id, id));
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "Artist not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Block if the artist still has releases — safest policy (no silent data loss)
    const releaseCount = await db.select({ count: sql<number>`count(*)` }).from(releases).where(eq(releases.artist_id, id));
    const n = Number(releaseCount[0]?.count ?? 0);
    if (n > 0) {
      return new Response(JSON.stringify({
        error: `Cannot delete artist with ${n} release${n > 1 ? "s" : ""} — reassign or delete those releases first.`
      }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    await db.delete(artists).where(eq(artists.id, id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
