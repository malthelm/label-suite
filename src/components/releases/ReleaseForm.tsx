"use client";

import { useState } from "react";

export function ReleaseForm({ artists, onClose }: { artists: Array<{ id: string; name: string }>; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [format, setFormat] = useState("single");
  const [upc, setUpc] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, artist_id: artistId || null, release_date: releaseDate || null,
          format, upc_ean: upc || null, cover_art_url: coverArt || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create release");
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
          {loading ? "Creating..." : "Create Release"}
        </button>
      </div>
    </form>
  );
}
