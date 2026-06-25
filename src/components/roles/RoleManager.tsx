"use client";

import { useState } from "react";
import { RoleForm, type RoleData } from "./RoleForm";

export interface RoleRow extends RoleData {
  id: string;
  contact_name?: string | null;
}

const badgeCls = (status?: string | null) =>
  status === "Signed"
    ? "bg-green-100 text-green-700"
    : status === "Confirmed"
    ? "bg-blue-100 text-blue-700"
    : status === "Pending"
    ? "bg-orange-100 text-orange-700"
    : "bg-neutral-100 text-neutral-600";

export function RoleManager({
  workId,
  contacts,
  roles,
}: {
  workId: string;
  contacts: Array<{ id: string; name: string }>;
  roles: RoleRow[];
}) {
  const [mode, setMode] = useState<null | { type: "create" } | { type: "edit"; role: RoleRow }>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Delete this role? This will recompute clearance.")) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete role");
      }
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
      setDeletingId(null);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Roles (Credits) — {roles.length}</h2>
        <button
          onClick={() => setMode({ type: "create" })}
          className="inline-flex items-center px-3 py-1.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
        >
          + Add role
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
        {roles.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-4 gap-3">
            <div className="min-w-0">
              <p className="font-medium truncate">{r.role || "—"} — {r.contact_name || "Unassigned"}</p>
              <p className="text-sm text-neutral-500">
                {r.scope || "No scope"} · {r.ownership_type || "—"} · {r.percent_share ?? 0}%
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-1 rounded-md ${badgeCls(r.clearance_status)}`}>
                {r.clearance_status || "Unknown"}
              </span>
              <button
                onClick={() => setMode({ type: "edit", role: r })}
                className="text-xs px-2 py-1 rounded-md text-neutral-600 hover:bg-neutral-100"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(r.id)}
                disabled={deletingId === r.id}
                className="text-xs px-2 py-1 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === r.id ? "…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
        {!roles.length && <p className="p-4 text-sm text-neutral-400">No roles yet. Add one to start clearing this work.</p>}
      </div>

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">{mode.type === "edit" ? "Edit role" : "New role"}</h2>
            <RoleForm
              workId={workId}
              contacts={contacts}
              role={mode.type === "edit" ? mode.role : undefined}
              onClose={() => setMode(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
