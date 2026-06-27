"use client";

import { useState } from "react";
import { RadioStationForm, type RadioStation } from "./RadioStationForm";

const TIER_ORDER = ["A", "B", "C", "D"];

export function RadioStationManager({
  initialStations,
}: {
  initialStations: Array<RadioStation>;
}) {
  const [stations, setStations] = useState(initialStations);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function deleteStation(id: string) {
    if (!confirm("Delete this radio station?")) return;
    const res = await fetch("/api/radio-stations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to delete");
      return;
    }
    setStations((prev) => prev.filter((s) => s.id !== id));
  }

  const editing = stations.find((s) => s.id === editingId);

  // Group by tier
  const grouped = new Map<string, RadioStation[]>();
  for (const s of stations) {
    const tier = s.tier || "Unassigned";
    if (!grouped.has(tier)) grouped.set(tier, []);
    grouped.get(tier)!.push(s);
  }
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a[0]);
    const bi = TIER_ORDER.indexOf(b[0]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{stations.length} stations</p>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
          + New Radio Station
        </button>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreating(false)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Radio Station</h2>
            <RadioStationForm onClose={() => setCreating(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Radio Station</h2>
            <RadioStationForm initial={editing} onClose={() => setEditingId(null)} />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {sortedGroups.map(([tier, items]) => (
          <section key={tier}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Tier {tier}</h2>
              <span className="text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {items.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{s.name}</p>
                      {s.call_sign && <span className="text-xs text-muted-foreground">({s.call_sign})</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {s.city || ""}{s.city && s.country ? ", " : ""}{s.country || ""}
                      {s.frequency ? ` · ${s.frequency}` : ""}
                      {s.dj_name ? ` · DJ: ${s.dj_name}` : ""}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {s.email && <a href={`mailto:${s.email}`} className="text-blue-600 hover:underline">{s.email}</a>}
                      {s.phone && <span>{s.phone}</span>}
                      {s.website && <a href={s.website} target="_blank" rel="noopener" className="text-blue-600 hover:underline">Website</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => setEditingId(s.id)}
                      className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-foreground">Edit</button>
                    <button onClick={() => deleteStation(s.id)}
                      className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {!stations.length && (
          <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
            <p className="text-lg">No radio stations yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
