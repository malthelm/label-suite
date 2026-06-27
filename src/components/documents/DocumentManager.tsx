"use client";

import { useState } from "react";
import { DocumentForm, type Document } from "./DocumentForm";

const DOC_TYPE_ORDER = ["contract", "license", "nda", "invoice", "split_sheet", "other"];

const TYPE_LABELS: Record<string, string> = {
  contract: "Contracts",
  license: "Licenses",
  nda: "NDAs",
  invoice: "Invoices",
  split_sheet: "Split Sheets",
  other: "Other",
};

const STATUS_COLORS: Record<string, string> = {
  signed: "bg-green-100 text-green-700",
  sent: "bg-blue-100 text-blue-700",
  expired: "bg-red-100 text-red-700",
  filed: "bg-neutral-100 text-neutral-600",
  draft: "bg-yellow-100 text-yellow-700",
};

export function DocumentManager({
  initialDocuments,
  artists,
  releases,
  contacts,
}: {
  initialDocuments: Array<Document & { artist_name?: string | null; release_title?: string | null; contact_name?: string | null }>;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
  contacts: Array<{ id: string; name: string }>;
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function deleteDocument(id: string) {
    if (!confirm("Delete this document?")) return;
    await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  const editing = documents.find((d) => d.id === editingId);

  // Group by doc_type
  const grouped = new Map<string, typeof documents>();
  for (const d of documents) {
    const type = d.doc_type || "other";
    if (!grouped.has(type)) grouped.set(type, []);
    grouped.get(type)!.push(d);
  }
  const sortedGroups = [...grouped.entries()].sort((a, b) => {
    const ai = DOC_TYPE_ORDER.indexOf(a[0]);
    const bi = DOC_TYPE_ORDER.indexOf(b[0]);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a[0].localeCompare(b[0]);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{documents.length} documents</p>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
          + New Document
        </button>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreating(false)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Document</h2>
            <DocumentForm artists={artists} releases={releases} contacts={contacts} onClose={() => setCreating(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Document</h2>
            <DocumentForm initial={editing} artists={artists} releases={releases} contacts={contacts} onClose={() => setEditingId(null)} />
          </div>
        </div>
      )}

      {!documents.length ? (
        <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <p className="text-lg">No documents yet.</p>
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
                {items.map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {d.artist_name || "—"} · {d.release_title || "—"} · {d.contact_name || "—"}
                      </p>
                      {d.file_link && <a href={d.file_link} target="_blank" rel="noopener" className="text-xs text-blue-600 hover:underline">Open →</a>}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${STATUS_COLORS[d.status || "draft"] || "bg-muted text-muted-foreground"}`}>
                        {d.status || "draft"}
                      </span>
                      <button onClick={() => setEditingId(d.id)}
                        className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-foreground">Edit</button>
                      <button onClick={() => deleteDocument(d.id)}
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
