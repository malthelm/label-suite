"use client";

interface ReleaseCard {
  id: string;
  title: string;
  artist_name?: string | null;
  format?: string | null;
  release_date?: string | null;
  release_ready?: boolean | null;
  status?: string | null;
}

const columns: Array<{ key: string; label: string; color: string }> = [
  { key: "draft", label: "Draft", color: "bg-neutral-100 text-neutral-600" },
  { key: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-700" },
  { key: "released", label: "Released", color: "bg-green-100 text-green-700" },
  { key: "archived", label: "Archived", color: "bg-neutral-200 text-neutral-400" },
];

export function ReleasePipeline({ releases }: { releases: ReleaseCard[] }) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Release Pipeline</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {columns.map((col) => {
          const items = releases.filter(
            (r) => (r.status || "draft") === col.key
          );
          return (
            <div
              key={col.key}
              className="bg-neutral-50 rounded-xl border border-neutral-200 p-3 space-y-2"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-neutral-400">{items.length}</span>
              </div>
              {!items.length ? (
                <p className="text-xs text-neutral-300 italic">No releases</p>
              ) : (
                items.map((r) => (
                  <a
                    key={r.id}
                    href={`/releases/${r.id}`}
                    className="block p-3 bg-white rounded-lg border border-neutral-100 hover:border-neutral-300 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {r.artist_name || "—"}
                      {r.format ? ` · ${r.format}` : ""}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {r.release_date && (
                        <span className="text-xs text-neutral-400">{r.release_date}</span>
                      )}
                      {r.release_ready !== null && r.release_ready !== undefined && (
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            r.release_ready
                              ? "bg-green-50 text-green-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {r.release_ready ? "Ready" : "Not ready"}
                        </span>
                      )}
                    </div>
                  </a>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
