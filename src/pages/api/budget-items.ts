import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { budget_line_items } from "../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.release_id) return err("release_id is required");
    if (!body.name || typeof body.name !== "string") return err("name is required");
    const amount = Number(body.amount);
    if (isNaN(amount)) return err("amount must be a number");
    const id = crypto.randomUUID();
    await db.insert(budget_line_items).values({
      id, release_id: body.release_id, name: body.name.trim(),
      amount, status: body.status || "pending",
      category_id: body.category_id || null,
    });
    return new Response(JSON.stringify({ id, ok: true }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");
    const updates: Record<string, any> = { updated_at: new Date() };
    for (const f of ["name", "amount", "status", "category_id"]) {
      if (body[f] !== undefined) updates[f] = body[f] || null;
    }
    await db.update(budget_line_items).set(updates).where(eq(budget_line_items.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) { return err(e.message, 500); }
};

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
}
