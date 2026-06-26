import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { campaigns, releases, artists, campaign_stations } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.campaign_name || typeof body.campaign_name !== "string" || body.campaign_name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Campaign name is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const id = crypto.randomUUID();
    await db.insert(campaigns).values({
      id,
      campaign_name: body.campaign_name.trim(),
      linked_release_id: body.linked_release_id || null,
      linked_artist_id: body.linked_artist_id || null,
      campaign_type: body.campaign_type || null,
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      status: body.status || "planning",
      owner: body.owner || null,
      goal: body.goal || null,
      budget_planned: body.budget_planned != null ? Number(body.budget_planned) : null,
      budget_actual: body.budget_actual != null ? Number(body.budget_actual) : null,
      kpi_summary: body.kpi_summary || null,
      notes: body.notes || null,
      performance_rating: body.performance_rating != null ? Number(body.performance_rating) : null,
      main_platform: body.main_platform || null,
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

    if (body.campaign_name !== undefined) {
      if (typeof body.campaign_name !== "string" || body.campaign_name.trim().length === 0) {
        return new Response(JSON.stringify({ error: "Campaign name cannot be blank" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    const textFields = ["campaign_name", "linked_release_id", "linked_artist_id", "campaign_type", "start_date", "end_date", "status", "owner", "goal", "kpi_summary", "notes", "main_platform"];
    for (const field of textFields) {
      if (body[field] !== undefined) updates[field] = body[field] || null;
    }
    if (body.budget_planned !== undefined) updates.budget_planned = body.budget_planned != null ? String(body.budget_planned) : null;
    if (body.budget_actual !== undefined) updates.budget_actual = body.budget_actual != null ? String(body.budget_actual) : null;
    if (body.performance_rating !== undefined) updates.performance_rating = body.performance_rating != null ? Number(body.performance_rating) : null;

    await db.update(campaigns).set(updates).where(eq(campaigns.id, body.id));
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
    const rows = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id));
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Clean up join table references
    await db.delete(campaign_stations).where(eq(campaign_stations.campaign_id, id));
    await db.delete(campaigns).where(eq(campaigns.id, id));

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};