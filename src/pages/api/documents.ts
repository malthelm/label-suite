import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { documents } from "../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.name) return err("name is required");
    const id = crypto.randomUUID();
    await db.insert(documents).values({
      id, name: body.name.trim(),
      doc_type: body.doc_type || null,
      release_id: body.release_id || null,
      artist_id: body.artist_id || null,
      contact_id: body.contact_id || null,
      status: body.status || "draft",
      file_link: body.file_link || null,
      notes: body.notes || null,
    });
    return new Response(JSON.stringify({ id, ok: true }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");
    const updates: Record<string, any> = { updated_at: new Date() };
    for (const f of ["name","doc_type","release_id","artist_id","contact_id","status","file_link","notes"]) {
      if (body[f] !== undefined) updates[f] = body[f] || null;
    }
    await db.update(documents).set(updates).where(eq(documents.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");
    await db.delete(documents).where(eq(documents.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};