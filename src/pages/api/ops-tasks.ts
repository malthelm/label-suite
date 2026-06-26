import type { APIRoute } from "astro";
import { db } from "../../lib/db";
import { ops_tasks, artists, releases } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

export const prerender = false;

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.task_name || typeof body.task_name !== "string" || body.task_name.trim().length === 0) {
      return err("Task name is required");
    }

    const id = crypto.randomUUID();
    await db.insert(ops_tasks).values({
      id,
      task_name: body.task_name.trim(),
      status: body.status || "todo",
      priority: body.priority || "P2",
      owner: body.owner || null,
      due_date: body.due_date || null,
      linked_artist_id: body.linked_artist_id || null,
      linked_release_id: body.linked_release_id || null,
      notes: body.notes || null,
      next_action: body.next_action || null,
      is_overdue: false,
    });

    return new Response(JSON.stringify({ id, ok: true }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return err(e.message, 500);
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("ID is required");

    const existing = (await db.select().from(ops_tasks).where(eq(ops_tasks.id, body.id)))[0];
    if (!existing) return err("Task not found", 404);

    const updates: Record<string, any> = { updated_at: new Date() };
    for (const f of ["task_name", "status", "priority", "owner", "due_date", "linked_artist_id", "linked_release_id", "notes", "next_action"]) {
      if (body[f] !== undefined) updates[f] = body[f] || null;
    }

    // Compute is_overdue automatically
    if (updates.status !== "done" && (existing.due_date || updates.due_date)) {
      const dueDate = updates.due_date || existing.due_date;
      updates.is_overdue = new Date(dueDate) < new Date();
    } else if (updates.status === "done") {
      updates.is_overdue = false;
    }

    await db.update(ops_tasks).set(updates).where(eq(ops_tasks.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return err(e.message, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.id) return err("ID is required");

    const existing = (await db.select().from(ops_tasks).where(eq(ops_tasks.id, body.id)))[0];
    if (!existing) return err("Task not found", 404);

    await db.delete(ops_tasks).where(eq(ops_tasks.id, body.id));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e: any) {
    return err(e.message, 500);
  }
};
