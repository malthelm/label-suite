"use client";

import { useState } from "react";
import { MediaAssetForm, type MediaAsset } from "./MediaAssetForm";

const ASSET_TYPE_ORDER = ["cover_art", "press_photo", "audio_clip", "video", "social_asset"];

const TYPE_LABELS: Record<string, string> = {
  cover_art: "Cover Art",
  press_photo: "Press Photo",
  audio_clip: "Audio Clip",
  video: "Video",
  social_asset: "Social Asset",
};

const APPROVAL_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  needs_revision: "bg-yellow-100 text-yellow-700",
  pending: "bg-neutral-100 text-neutral-600",
};

const DELIVERY_COLORS: Record<string, string> = {
  received: "bg-green-100 text-green-700",
  sent: "bg-blue-100 text-blue-700",
  delayed: "bg-red-100 text-red-700",
  not_sent: "bg-neutral-100 text-neutral-600",
};

export function MediaAssetManager({
  initialAssets,
  artists,
  releases,
}: {
  initialAssets: Array<MediaAsset & { artist_name?: string | null; release_title?: string | null }>;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function deleteAsset(id: string) {
    if (!confirm("Delete this media asset?")) return;
    await fetch("/api/media-assets", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  const editing = assets.find((a) => a.id === editingId);

  // Group by asset_type
  const grouped = new Map<string, typeof assets>();
  for (const a of assets) {
    const type = a.asset_type || "other";
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type)!.push(a);
  }
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    const ai = ASSET_TYPE_ORDER.indexOf(a[0]);
    const bi = ASSET_TYPE_ORDER.indexOf(b[0]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{assets.length} assets</p>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
          + New Media Asset
        </button>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreating(false)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Media Asset</h2>
            <MediaAssetForm artists={artists} releases={releases} onClose={() => setCreating(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Media Asset</h2>
            <MediaAssetForm initial={editing} artists={artists} releases={releases} onClose={() => setEditingId(null)} />
          </div>
        </div>
      )}

      {!assets.length ? (
        <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <p className="text-lg">No media assets yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGroups.map(([type, items]) => (
            <section key={type}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h2>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              <div className="bg-card border border-border rounded-xl divide-y divide-border">
                {items.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{a.asset_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {a.artist_name || "—"} · {a.release_title || "—"}
                        {a.version ? ` · v${a.version}` : ""}
                      </p>
                      {a.file_link && <a href={a.file_link} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline">Open file →</a>}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-1 rounded ${APPROVAL_COLORS[a.approval_status || "pending"] || "bg-muted text-muted-foreground"}`}>
                        {a.approval_status?.replace(/_/g, " ") || "pending"}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${DELIVERY_COLORS[a.delivery_status || "not_sent"] || "bg-muted text-muted-foreground"}`}>
                        {a.delivery_status?.replace(/_/g, " ") || "not_sent"}
                      </span>
                      <button onClick={() => setEditingId(a.id)}
                        className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-foreground">Edit</button>
                      <button onClick={() => deleteAsset(a.id)}
                        className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700">Del</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
