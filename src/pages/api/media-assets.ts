import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { media_assets } from "../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.asset_name) return err("asset_name is required");
    const id = crypto.randomUUID();
    await db.insert(media_assets).values({
      id, asset_name: body.asset_name.trim(),
      asset_type: body.asset_type || null,
      linked_artist_id: body.linked_artist_id || null,
      linked_release_id: body.linked_release_id || null,
      version: body.version || null,
      approval_status: body.approval_status || "pending",
      delivery_status: body.delivery_status || "not_sent",
      file_link: body.file_link || null,
      notes: body.notes || null,
      date_uploaded: body.date_uploaded || null,
    });
    return new Response(JSON.stringify({ id, ok: true }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");
    const updates: Record<string, any> = { updated_at: new Date() };
    for (const f of ["asset_name","asset_type","linked_artist_id","linked_release_id","version","approval_status","delivery_status","file_link","notes","date_uploaded"]) {
      if (body[f] !== undefined) updates[f] = body[f] || null;
    }
    await db.update(media_assets).set(updates).where(eq(media_assets.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");
    await db.delete(media_assets).where(eq(media_assets.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};