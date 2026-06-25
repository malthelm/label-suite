import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { artists, contacts, roles, calls } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Name is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const id = crypto.randomUUID();
    await db.insert(contacts).values({
      id,
      name: body.name.trim(),
      email: body.email || null,
      phone: body.phone || null,
      role: body.role || null,
      company: body.company || null,
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
        return new Response(JSON.stringify({ error: "Name cannot be blank" }), { status: 400, headers: { "Content-Type": "application/json" } });
      }
    }

    const updates: Record<string, any> = { updated_at: new Date() };
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.email !== undefined) updates.email = body.email || null;
    if (body.phone !== undefined) updates.phone = body.phone || null;
    if (body.role !== undefined) updates.role = body.role || null;
    if (body.company !== undefined) updates.company = body.company || null;
    if (body.notes !== undefined) updates.notes = body.notes || null;

    await db.update(contacts).set(updates).where(eq(contacts.id, body.id));
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
    const rows = await db.select({ id: contacts.id }).from(contacts).where(eq(contacts.id, id));
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "Contact not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Check FK references before allowing delete
    const usageMessages: string[] = [];

    const artistCount = await db.select({ count: sql<number>`count(*)` }).from(artists).where(eq(artists.contact_id, id));
    const nArtists = Number(artistCount[0]?.count ?? 0);
    if (nArtists > 0) {
      usageMessages.push(`${nArtists} artist${nArtists > 1 ? "s" : ""}`);
    }

    const roleCount = await db.select({ count: sql<number>`count(*)` }).from(roles).where(eq(roles.contact_id, id));
    const nRoles = Number(roleCount[0]?.count ?? 0);
    if (nRoles > 0) {
      usageMessages.push(`${nRoles} role${nRoles > 1 ? "s" : ""}`);
    }

    const callCount = await db.select({ count: sql<number>`count(*)` }).from(calls).where(eq(calls.contact_id, id));
    const nCalls = Number(callCount[0]?.count ?? 0);
    if (nCalls > 0) {
      usageMessages.push(`${nCalls} call${nCalls > 1 ? "s" : ""}`);
    }

    if (usageMessages.length > 0) {
      return new Response(JSON.stringify({
        error: `Cannot delete contact — still referenced by ${usageMessages.join(", ")}. Remove those references first.`
      }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    await db.delete(contacts).where(eq(contacts.id, id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};
