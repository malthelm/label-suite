"use client";

import { useState } from "react";

export interface Artist {
  id: string;
  name: string;
  bio?: string | null;
  pro?: string | null;
  spotify_id?: string | null;
  spotify_followers?: number | null;
  spotify_popularity?: number | null;
  ipi?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
}

export function ArtistForm({ initial, onClose }: { initial?: Artist | null; onClose: () => void }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [bio, setBio] = useState(initial?.bio || "");
  const [pro, setPro] = useState(initial?.pro || "");
  const [spotifyId, setSpotifyId] = useState(initial?.spotify_id || "");
  const [followers, setFollowers] = useState(initial?.spotify_followers?.toString() || "");
  const [popularity, setPopularity] = useState(initial?.spotify_popularity?.toString() || "");
  const [ipi, setIpi] = useState(initial?.ipi || "");
  const [instagram, setInstagram] = useState(initial?.instagram || "");
  const [tiktok, setTiktok] = useState(initial?.tiktok || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, any> = {
        name, bio, pro, spotify_id: spotifyId,
        spotify_followers: followers || null,
        spotify_popularity: popularity || null,
        ipi, instagram, tiktok,
      };
      const res = await fetch("/api/artists", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...body, id: initial!.id } : body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} artist`);
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
        <label className="block text-sm font-medium text-neutral-700 mb-1">Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Bio</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">PRO</label>
          <input value={pro} onChange={(e) => setPro(e.target.value)} placeholder="ASCAP, KODA..."
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Spotify ID</label>
          <input value={spotifyId} onChange={(e) => setSpotifyId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Spotify Followers</label>
          <input type="number" value={followers} onChange={(e) => setFollowers(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Spotify Popularity</label>
          <input type="number" min="0" max="100" value={popularity} onChange={(e) => setPopularity(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">IPI</label>
          <input value={ipi} onChange={(e) => setIpi(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">TikTok</label>
        <input value={tiktok} onChange={(e) => setTiktok(e.target.value)}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50">
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Artist"}
        </button>
      </div>
    </form>
  );
}
