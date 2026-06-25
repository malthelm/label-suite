import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { bugs } from "../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) {
      return new Response(JSON.stringify({ error: "ID is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    if (body.status) updates.status = body.status;
    if (body.priority) updates.priority = body.priority;

    await db.update(bugs).set(updates).where(eq(bugs.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
