"use client";

import { useState } from "react";
import { RoyaltyForm, type RoyaltyRecord } from "./RoyaltyForm";

export function RoyaltyManager({
  initialRoyalties,
  artists,
  releases,
  totalNet,
  unpaidCount,
  paidThisYear,
}: {
  initialRoyalties: Array<RoyaltyRecord & { artist_name?: string | null; release_title?: string | null }>;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
  totalNet: number;
  unpaidCount: number;
  paidThisYear: number;
}) {
  const [royalties, setRoyalties] = useState(initialRoyalties);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function deleteRoyalty(id: string) {
    if (!confirm("Delete this royalty record?")) return;
    await fetch("/api/royalties", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setRoyalties((prev) => prev.filter((r) => r.id !== id));
  }

  const editing = royalties.find((r) => r.id === editingId);

  // Group by artist name
  const artistMap = new Map<string, typeof royalties>();
  for (const row of royalties) {
    const key = row.artist_name || "Unassigned";
    if (!artistMap.has(key)) artistMap.set(key, []);
    artistMap.get(key)!.push(row);
  }
  const grouped = [...artistMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-6">
      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground">Total Net Revenue</p>
          <p className="text-3xl font-bold mt-1">
            ${Number(totalNet).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground">Unpaid Statements</p>
          <p className="text-3xl font-bold mt-1">{unpaidCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground">Paid This Year</p>
          <p className="text-3xl font-bold mt-1">{paidThisYear}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{royalties.length} records</p>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
          + New Royalty Record
        </button>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreating(false)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Royalty Record</h2>
            <RoyaltyForm artists={artists} releases={releases} onClose={() => setCreating(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Royalty Record</h2>
            <RoyaltyForm initial={editing} artists={artists} releases={releases} onClose={() => setEditingId(null)} />
          </div>
        </div>
      )}

      {!royalties.length ? (
        <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <p className="text-lg">No royalty records yet.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([artist, rows]) => (
            <section key={artist}>
              <h2 className="text-xl font-semibold mb-3">{artist}</h2>
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium">Record</th>
                      <th className="text-left px-4 py-3 font-medium">Period</th>
                      <th className="text-left px-4 py-3 font-medium">Source</th>
                      <th className="text-right px-4 py-3 font-medium">Gross</th>
                      <th className="text-right px-4 py-3 font-medium">Costs</th>
                      <th className="text-right px-4 py-3 font-medium">Net</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-center px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r) => (
                      <tr key={r.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.record_name}</p>
                          {r.release_title && <p className="text-xs text-muted-foreground">{r.release_title}</p>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.statement_period || "—"}</td>
                        <td className="px-4 py-3">{r.source || "—"}</td>
                        <td className="px-4 py-3 text-right">{r.gross_revenue != null ? `$${Number(r.gross_revenue).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</td>
                        <td className="px-4 py-3 text-right">{r.costs != null ? `$${Number(r.costs).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">{r.net_revenue != null ? `$${Number(r.net_revenue).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${
                            r.paid_out === "paid" ? "bg-green-100 text-green-700" :
                            r.paid_out === "pending" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>
                            {r.paid_out || "unpaid"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => setEditingId(r.id)}
                              className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-foreground">Edit</button>
                            <button onClick={() => deleteRoyalty(r.id)}
                              className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700">Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
