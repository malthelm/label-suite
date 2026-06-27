"use client";

import { useState } from "react";

const DOC_TYPE_OPTIONS = ["contract", "license", "nda", "invoice", "split_sheet", "other"];
const STATUS_OPTIONS = ["draft", "sent", "signed", "expired", "filed"];

export interface Document {
  id: string;
  name: string;
  doc_type?: string | null;
  release_id?: string | null;
  artist_id?: string | null;
  contact_id?: string | null;
  status?: string | null;
  file_link?: string | null;
  notes?: string | null;
}

export function DocumentForm({
  initial,
  artists,
  releases,
  contacts,
  onClose,
}: {
  initial?: Document | null;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
  contacts: Array<{ id: string; name: string }>;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name || "");
  const [docType, setDocType] = useState(initial?.doc_type || "");
  const [artistId, setArtistId] = useState(initial?.artist_id || "");
  const [releaseId, setReleaseId] = useState(initial?.release_id || "");
  const [contactId, setContactId] = useState(initial?.contact_id || "");
  const [status, setStatus] = useState(initial?.status || "draft");
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
        name: name.trim(),
        doc_type: docType || null,
        artist_id: artistId || null,
        release_id: releaseId || null,
        contact_id: contactId || null,
        status,
        file_link: fileLink || null,
        notes: notes || null,
      };
      const res = await fetch("/api/documents", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...body, id: initial!.id } : body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} document`);
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
        <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required
          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            <option value="">— Select —</option>
            {DOC_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1).replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
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
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Linked Contact</label>
          <select value={contactId} onChange={(e) => setContactId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            <option value="">— None —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Document"}
        </button>
      </div>
    </form>
  );
}
