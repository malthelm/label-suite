"use client";

import { useState } from "react";
import { CampaignForm, type Campaign } from "./CampaignForm";

const STATUS_GROUPS = [
  { key: "planning", label: "Planning", color: "bg-blue-100 text-blue-700" },
  { key: "active", label: "Active", color: "bg-green-100 text-green-700" },
  { key: "done", label: "Done", color: "bg-neutral-100 text-neutral-600" },
];

const STATUS_BADGE: Record<string, string> = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  done: "bg-neutral-100 text-neutral-600",
};

export function CampaignManager({
  initialCampaigns,
  artists,
  releases,
}: {
  initialCampaigns: Array<Campaign & { artist_name?: string | null; release_title?: string | null }>;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function deleteCampaign(id: string) {
    if (!confirm("Delete this campaign?")) return;
    await fetch("/api/campaigns", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  const editing = campaigns.find((c) => c.id === editingId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{campaigns.length} campaigns</p>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
          + New Campaign
        </button>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreating(false)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Campaign</h2>
            <CampaignForm artists={artists} releases={releases} onClose={() => setCreating(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Campaign</h2>
            <CampaignForm initial={editing} artists={artists} releases={releases} onClose={() => setEditingId(null)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STATUS_GROUPS.map((group) => {
          const items = campaigns.filter((c) => (c.status || "planning") === group.key);
          return (
            <div key={group.key} className="bg-muted/30 rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.color}`}>
                  {group.label}
                </span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              {!items.length ? (
                <p className="text-xs text-muted-foreground italic">No campaigns</p>
              ) : (
                items.map((c) => (
                  <div key={c.id} className="p-3 bg-card rounded-lg border border-border space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm flex-1">{c.campaign_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_BADGE[c.status || "planning"]}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {c.campaign_type && <span>Type: {c.campaign_type}</span>}
                      {c.main_platform && <span> · {c.main_platform}</span>}
                      <div className="flex flex-wrap gap-1">
                        {c.artist_name && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">{c.artist_name}</span>}
                        {c.release_title && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">{c.release_title}</span>}
                      </div>
                      {c.owner && <span>👤 {c.owner}</span>}
                      {(c.start_date || c.end_date) && <span>📅 {c.start_date || "?"} → {c.end_date || "?"}</span>}
                      {c.budget_planned != null && <span>💰 {Number(c.budget_planned).toLocaleString()} DKK</span>}
                    </div>
                    {c.goal && <p className="text-xs text-foreground italic">→ {c.goal}</p>}
                    <div className="flex gap-1 pt-1 border-t border-border">
                      <button onClick={() => setEditingId(c.id)}
                        className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-foreground flex-1">Edit</button>
                      <button onClick={() => deleteCampaign(c.id)}
                        className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 flex-1">Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
