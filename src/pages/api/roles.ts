import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { roles } from "../../db/schema";
import { eq } from "drizzle-orm";
import { persistAfterRoleChange } from "../../lib/readiness";

export const prerender = false;

const SCOPES = ["Publishing", "Master", "Mechanical"];
const CLEARANCE = ["Signed", "Confirmed", "Pending", "Unknown"];
const OWNERSHIP = ["Rights", "Credit"];

function err(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.work_id) return err("work_id is required");
    if (!body.role || typeof body.role !== "string") return err("role is required");

    const share = body.percent_share != null ? Number(body.percent_share) : null;
    if (share != null && (Number.isNaN(share) || share < 0 || share > 100)) {
      return err("percent_share must be between 0 and 100");
    }

    const id = crypto.randomUUID();
    await db.insert(roles).values({
      id,
      work_id: body.work_id,
      contact_id: body.contact_id || null,
      role: body.role.trim(),
      ownership_type: OWNERSHIP.includes(body.ownership_type) ? body.ownership_type : "Rights",
      scope: SCOPES.includes(body.scope) ? body.scope : null,
      percent_share: share,
      clearance_status: CLEARANCE.includes(body.clearance_status) ? body.clearance_status : "Unknown",
    });

    await persistAfterRoleChange(body.work_id);

    return new Response(JSON.stringify({ id, ok: true }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return err(e.message, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");

    const existing = (await db.select().from(roles).where(eq(roles.id, body.id)))[0];
    if (!existing) return err("Role not found", 404);

    const updates: Record<string, any> = { updated_at: new Date() };
    if (body.contact_id !== undefined) updates.contact_id = body.contact_id || null;
    if (body.role !== undefined) updates.role = body.role ? String(body.role).trim() : null;
    if (body.ownership_type !== undefined && OWNERSHIP.includes(body.ownership_type)) updates.ownership_type = body.ownership_type;
    if (body.scope !== undefined) updates.scope = SCOPES.includes(body.scope) ? body.scope : null;
    if (body.clearance_status !== undefined && CLEARANCE.includes(body.clearance_status)) updates.clearance_status = body.clearance_status;
    if (body.percent_share !== undefined) {
      const share = body.percent_share != null && body.percent_share !== "" ? Number(body.percent_share) : null;
      if (share != null && (Number.isNaN(share) || share < 0 || share > 100)) return err("percent_share must be between 0 and 100");
      updates.percent_share = share;
    }

    await db.update(roles).set(updates).where(eq(roles.id, body.id));
    await persistAfterRoleChange(existing.work_id!);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return err(e.message, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("id is required");

    const existing = (await db.select().from(roles).where(eq(roles.id, body.id)))[0];
    if (!existing) return err("Role not found", 404);

    await db.delete(roles).where(eq(roles.id, body.id));
    if (existing.work_id) await persistAfterRoleChange(existing.work_id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return err(e.message, 500);
  }
};
