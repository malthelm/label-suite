"use client";

import { useState } from "react";

const ASSET_TYPE_OPTIONS = ["cover_art", "press_photo", "audio_clip", "video", "social_asset"];
const APPROVAL_STATUS_OPTIONS = ["pending", "approved", "rejected", "needs_revision"];
const DELIVERY_STATUS_OPTIONS = ["not_sent", "sent", "received", "delayed"];

export interface MediaAsset {
  id: string;
  asset_name: string;
  asset_type?: string | null;
  linked_artist_id?: string | null;
  linked_release_id?: string | null;
  version?: string | null;
  approval_status?: string | null;
  delivery_status?: string | null;
  file_link?: string | null;
  notes?: string | null;
  date_uploaded?: string | null;
}

export function MediaAssetForm({
  initial,
  artists,
  releases,
  onClose,
}: {
  initial?: MediaAsset | null;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [assetName, setAssetName] = useState(initial?.asset_name || "");
  const [assetType, setAssetType] = useState(initial?.asset_type || "");
  const [artistId, setArtistId] = useState(initial?.linked_artist_id || "");
  const [releaseId, setReleaseId] = useState(initial?.linked_release_id || "");
  const [version, setVersion] = useState(initial?.version || "");
  const [approvalStatus, setApprovalStatus] = useState(initial?.approval_status || "pending");
  const [deliveryStatus, setDeliveryStatus] = useState(initial?.delivery_status || "not_sent");
  const [fileLink, setFileLink] = useState(initial?.file_link || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, any> = {
        asset_name: assetName.trim(),
        asset_type: assetType || null,
        linked_artist_id: artistId || null,
        linked_release_id: releaseId || null,
        version: version || null,
        approval_status: approvalStatus,
        delivery_status: deliveryStatus,
        file_link: fileLink || null,
        notes: notes || null,
      };
      const res = await fetch("/api/media-assets", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...body, id: initial!.id } : body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} media asset`);
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Asset Name *</label>
        <input value={assetName} onChange={(e) => setAssetName(e.target.value)} required
          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Asset Type</label>
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            <option value="">— Select —</option>
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Version</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v1, final, etc."
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Linked Artist</label>
          <select value={artistId} onChange={(e) => setArtistId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            <option value="">— None —</option>
            {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Linked Release</label>
          <select value={releaseId} onChange={(e) => setReleaseId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            <option value="">— None —</option>
            {releases.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Approval Status</label>
          <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            {APPROVAL_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Delivery Status</label>
          <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            {DELIVERY_STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">File Link (URL)</label>
        <input type="url" value={fileLink} onChange={(e) => setFileLink(e.target.value)} placeholder="https://..."
          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background" />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50">
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Media Asset"}
        </button>
      </div>
    </form>
  );
}
