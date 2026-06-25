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

const scopeLabel = (scope?: string | null) => {
  if (scope === "Master") return "Master";
  if (scope === "Publishing") return "Publishing";
  if (scope === "Mechanical") return "Publishing (Mechanical)";
  return scope || "No scope";
};

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

  // Group roles by scope for visual organization
  const pubRoles = roles.filter(
    (r) => r.scope === "Publishing" || r.scope === "Mechanical",
  );
  const masterRoles = roles.filter((r) => r.scope === "Master");
  const otherRoles = roles.filter(
    (r) => r.scope !== "Publishing" && r.scope !== "Mechanical" && r.scope !== "Master",
  );

  function renderRoleRow(r: RoleRow) {
    const isCredit = r.ownership_type === "Credit";
    return (
      <div key={r.id} className="flex items-center justify-between p-4 gap-3">
        <div className="min-w-0">
          <p className="font-medium truncate flex items-center gap-2">
            {r.role || "—"} — {r.contact_name || "Unassigned"}
            {isCredit && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-500 font-normal">
                credit only
              </span>
            )}
          </p>
          <p className="text-sm text-neutral-500">
            {scopeLabel(r.scope)} · {isCredit ? "Credit (no clearance)" : `${r.ownership_type || "—"} · ${r.percent_share ?? 0}%`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isCredit && (
            <span className={`text-xs px-2 py-1 rounded-md ${badgeCls(r.clearance_status)}`}>
              {r.clearance_status || "Unknown"}
            </span>
          )}
          {isCredit && (
            <span className="text-xs px-2 py-1 rounded-md bg-neutral-50 text-neutral-400 italic">
              no clearance
            </span>
          )}
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
    );
  }

  const totalRoles = roles.length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Roles — {totalRoles}</h2>
        <button
          onClick={() => setMode({ type: "create" })}
          className="inline-flex items-center px-3 py-1.5 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors"
        >
          + Add role
        </button>
      </div>

      {/* Publishing section */}
      {pubRoles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Publishing Universe
            <span className="text-xs font-normal text-neutral-400">(includes Mechanical)</span>
          </h3>
          <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
            {pubRoles.map(renderRoleRow)}
          </div>
        </div>
      )}

      {/* Master section */}
      {masterRoles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
            Master Universe
          </h3>
          <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
            {masterRoles.map(renderRoleRow)}
          </div>
        </div>
      )}

      {/* Any roles without a recognized scope */}
      {otherRoles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-400 inline-block" />
            Other
          </h3>
          <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100">
            {otherRoles.map(renderRoleRow)}
          </div>
        </div>
      )}

      {totalRoles === 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <p className="p-4 text-sm text-neutral-400">No roles yet. Add one to start clearing this work.</p>
        </div>
      )}

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