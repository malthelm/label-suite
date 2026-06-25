"use client";

import { useState } from "react";

export function TrackForm({ releaseId, works, onClose }: {
  releaseId: string;
  works: Array<{ id: string; title: string; isrc: string | null }>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [position, setPosition] = useState("");
  const [version, setVersion] = useState("Main");
  const [audioUrl, setAudioUrl] = useState("");
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [workId, setWorkId] = useState("");
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [autoIsrc, setAutoIsrc] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        title, release_id: releaseId,
        position: position ? Number(position) : null,
        version, audio_url: audioUrl || null,
        auto_isrc: autoIsrc,
      };
      if (mode === "existing" && workId) {
        payload.work_id = workId;
      } else if (mode === "new" && newWorkTitle) {
        payload.new_work_title = newWorkTitle;
      }

      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create track");
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
        <label className="block text-sm font-medium text-neutral-700 mb-1">Track Title *</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Position</label>
          <input type="number" value={position} onChange={(e) => setPosition(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Version</label>
          <input value={version} onChange={(e) => setVersion(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Audio URL</label>
        <input value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://..."
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
      </div>

      <div className="border-t border-neutral-200 pt-4">
        <div className="flex gap-3 mb-3">
          <button type="button" onClick={() => setMode("existing")}
            className={`text-sm px-3 py-1.5 rounded-md ${mode === "existing" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>
            Link to existing work
          </button>
          <button type="button" onClick={() => setMode("new")}
            className={`text-sm px-3 py-1.5 rounded-md ${mode === "new" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>
            Create new work
          </button>
        </div>
        {mode === "existing" ? (
          <select value={workId} onChange={(e) => setWorkId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900">
            <option value="">— Select work —</option>
            {works.map((w) => <option key={w.id} value={w.id}>{w.title} {w.isrc ? `(${w.isrc})` : ""}</option>)}
          </select>
        ) : (
          <input value={newWorkTitle} onChange={(e) => setNewWorkTitle(e.target.value)} placeholder="New work title"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900" />
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={autoIsrc} onChange={(e) => setAutoIsrc(e.target.checked)}
          className="rounded border-neutral-300" />
        Auto-generate ISRC
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50">
          {loading ? "Creating..." : "Create Track"}
        </button>
      </div>
    </form>
  );
}
