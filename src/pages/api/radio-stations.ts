import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { radio_stations, campaign_stations } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Station name is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const id = crypto.randomUUID();
    await db.insert(radio_stations).values({
      id,
      name: body.name.trim(),
      call_sign: body.call_sign || null,
      frequency: body.frequency || null,
      city: body.city || null,
      state: body.state || null,
      country: body.country || null,
      email: body.email || null,
      phone: body.phone || null,
      website: body.website || null,
      dj_name: body.dj_name || null,
      tier: body.tier || null,
      notes: body.notes || null,
    });

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

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Station name cannot be blank" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    const fields = ["name", "call_sign", "frequency", "city", "state", "country", "email", "phone", "website", "dj_name", "tier", "notes"];
    for (const field of fields) {
      if (body[field] !== undefined) updates[field] = body[field] || null;
    }

    await db.update(radio_stations).set(updates).where(eq(radio_stations.id, body.id));
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
    const rows = await db.select({ id: radio_stations.id }).from(radio_stations).where(eq(radio_stations.id, id));
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "Radio station not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Check FK references
    const usageCount = await db.select({ count: sql<number>`count(*)` }).from(campaign_stations).where(eq(campaign_stations.station_id, id));
    const nUsages = Number(usageCount[0]?.count ?? 0);
    if (nUsages > 0) {
      return new Response(JSON.stringify({
        error: `Cannot delete radio station — still referenced by ${nUsages} campaign link${nUsages > 1 ? "s" : ""}. Remove those references first.`
      }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    await db.delete(radio_stations).where(eq(radio_stations.id, id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};