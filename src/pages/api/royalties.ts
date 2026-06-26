import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { royalties_revenue } from "../../db/schema";
import { eq } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.record_name || typeof body.record_name !== "string" || body.record_name.trim().length === 0) {
      return err("record_name is required");
    }

    const id = crypto.randomUUID();
    await db.insert(royalties_revenue).values({
      id,
      record_name: body.record_name.trim(),
      statement_period: body.statement_period || null,
      source: body.source || null,
      artist_id: body.artist_id || null,
      release_id: body.release_id || null,
      gross_revenue: body.gross_revenue !== undefined ? Number(body.gross_revenue) : null,
      costs: body.costs !== undefined ? Number(body.costs) : null,
      net_revenue: body.net_revenue !== undefined ? Number(body.net_revenue) : null,
      paid_out: body.paid_out || "unpaid",
      payment_date: body.payment_date || null,
      notes: body.notes || null,
      revenue_type: body.revenue_type || null,
      revenue_month: body.revenue_month || null,
      source_contact_id: body.source_contact_id || null,
      payment_method: body.payment_method || null,
    });
    return new Response(JSON.stringify({ id, ok: true }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return err(e.message, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");
    if (body.record_name !== undefined && (typeof body.record_name !== "string" || body.record_name.trim().length === 0)) {
      return err("record_name cannot be blank");
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    const fields = [
      "record_name", "statement_period", "source", "artist_id", "release_id",
      "gross_revenue", "costs", "net_revenue", "paid_out", "payment_date",
      "notes", "revenue_type", "revenue_month", "source_contact_id", "payment_method"
    ];
    for (const f of fields) {
      if (body[f] !== undefined) updates[f] = f === "record_name" ? body[f].trim() : body[f];
    }
    // Ensure numeric fields are actually numbers
    for (const nf of ["gross_revenue", "costs", "net_revenue"]) {
      if (updates[nf] !== undefined) updates[nf] = Number(updates[nf]);
    }
    await db.update(royalties_revenue).set(updates).where(eq(royalties_revenue.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return err(e.message, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");

    const rows = await db.select({ id: royalties_revenue.id }).from(royalties_revenue).where(eq(royalties_revenue.id, body.id));
    if (!rows.length) {
      return err("Royalty record not found", 404);
    }
    await db.delete(royalties_revenue).where(eq(royalties_revenue.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return err(e.message, 500);
  }
};

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } });
}