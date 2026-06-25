"use client";

import { useState, useEffect } from "react";

interface Bug {
  id: string;
  title: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  auto_generated: boolean | null;
}

export function BugInbox({ initialBugs }: { initialBugs: Bug[] }) {
  const [bugs, setBugs] = useState(initialBugs);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  async function runSweep() {
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch("/api/sweep", { method: "POST" });
      const data = await res.json();
      setSweepResult(`Sweep: ${data.created} new, ${data.openIssues} open, ${data.closed} closed. Re-evaluated ${data.releasesReevaluated} releases, ${data.tracksReevaluated} tracks.`);
      // Refresh bugs
      window.location.reload();
    } catch {
      setSweepResult("Sweep failed.");
    } finally {
      setSweeping(false);
    }
  }

  async function updateStatus(bugId: string, status: string) {
    await fetch("/api/bugs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: bugId, status }),
    });
    setBugs(prev => prev.map(b => b.id === bugId ? { ...b, status } : b));
  }

  const priorityColor: Record<string, string> = {
    P0: "bg-red-100 text-red-700",
    P1: "bg-orange-100 text-orange-700",
    P2: "bg-neutral-100 text-neutral-600",
    P3: "bg-neutral-50 text-neutral-400",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">🐛 Bugs ({bugs.length})</h3>
        <button onClick={runSweep} disabled={sweeping}
          className="px-3 py-1.5 bg-neutral-900 text-white text-xs font-medium rounded-md hover:bg-neutral-800 disabled:opacity-50">
          {sweeping ? "Sweeping..." : "Run Sweep"}
        </button>
      </div>
      {sweepResult && <p className="text-xs text-neutral-500">{sweepResult}</p>}
      <div className="space-y-2">
        {bugs.map((b) => (
          <div key={b.id} className="p-3 rounded-lg border border-neutral-200">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityColor[b.priority || "P3"]}`}>{b.priority || "P3"}</span>
              <span className="font-medium text-sm flex-1">{b.title}</span>
              {b.auto_generated && <span className="text-xs text-neutral-400">auto</span>}
            </div>
            {b.description && <p className="text-xs text-neutral-500 mt-1">{b.description}</p>}
            <div className="flex gap-1 mt-2">
              {["logged", "triaged", "in_progress", "done"].map((s) => (
                <button key={s} onClick={() => updateStatus(b.id, s)}
                  className={`text-xs px-2 py-0.5 rounded ${b.status === s ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
        {!bugs.length && <p className="text-sm text-neutral-400">No open bugs. 🎉</p>}
      </div>
    </div>
  );
}
