"use client";

import { useState } from "react";
import { type Release } from "./ReleaseForm";

export function ReleaseEditButton({ release, artists }: { release: Release; artists: Array<{ id: string; name: string }> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
        aria-label={`Edit ${release.title}`}
      >
        Edit
      </button>
      {open && (
        <EditDialog release={release} artists={artists} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function EditDialog({ release, artists, onClose }: { release: Release; artists: any[]; onClose: () => void }) {
  const [title, setTitle] = useState(release.title);
  const [artistId, setArtistId] = useState(release.artist_id || "");
  const [releaseDate, setReleaseDate] = useState(release.release_date || "");
  const [format, setFormat] = useState(release.format || "single");
  const [status, setStatus] = useState(release.status || "draft");
  const [upc, setUpc] = useState(release.upc_ean || "");
  const [coverArt, setCoverArt] = useState(release.cover_art_url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/releases", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: release.id,
          title, artist_id: artistId || null, release_date: releaseDate || null,
          format, status, upc_ean: upc || null, cover_art_url: coverArt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Edit Release</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Artist</label>
            <select value={artistId} onChange={(e) => setArtistId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              <option value="">— Select artist —</option>
              {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Release Date</label>
              <input type="date" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
                <option value="single">Single</option>
                <option value="EP">EP</option>
                <option value="album">Album</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="released">Released</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">UPC/EAN</label>
              <input value={upc} onChange={(e) => setUpc(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Cover Art URL</label>
              <input value={coverArt} onChange={(e) => setCoverArt(e.target.value)} placeholder="https://..."
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900">Cancel</button>
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ReleaseDeleteButton({ release }: { release: Release }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onDelete() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/releases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: release.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirming(true); }}
        className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
        aria-label={`Delete ${release.title}`}
      >
        Delete
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !loading && setConfirming(false)}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-2">Delete {release.title}?</h2>
        <p className="text-sm text-neutral-500 mb-2">This will also delete all {release.title}'s tracks. This action cannot be undone.</p>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={() => setConfirming(false)} disabled={loading} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900">Cancel</button>
          <button onClick={onDelete} disabled={loading}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
