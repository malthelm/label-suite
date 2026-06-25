import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { dsp_pitches } from "../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.release_id) return err("release_id is required");
    const id = crypto.randomUUID();
    await db.insert(dsp_pitches).values({
      id, release_id: body.release_id, platform: body.platform || "Spotify",
      status: body.status || "draft", sent_date: body.sent_date || null, response: body.response || null,
    });
    return new Response(JSON.stringify({ id, ok: true }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");
    const updates: Record<string, any> = { updated_at: new Date() };
    for (const f of ["platform", "status", "sent_date", "response"]) {
      if (body[f] !== undefined) updates[f] = body[f] || null;
    }
    await db.update(dsp_pitches).set(updates).where(eq(dsp_pitches.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
}
