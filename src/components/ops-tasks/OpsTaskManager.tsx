"use client";

import { useState } from "react";
import { OpsTaskForm, type OpsTask } from "./OpsTaskForm";

const STATUS_COLUMNS = [
  { key: "todo", label: "To Do", color: "bg-neutral-100 text-neutral-600" },
  { key: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
  { key: "blocked", label: "Blocked", color: "bg-red-100 text-red-700" },
  { key: "done", label: "Done", color: "bg-green-100 text-green-700" },
];

const PRIORITY_COLORS: Record<string, string> = {
  P0: "bg-red-100 text-red-700",
  P1: "bg-orange-100 text-orange-700",
  P2: "bg-neutral-100 text-neutral-600",
  P3: "bg-neutral-50 text-neutral-400",
};

export function OpsTaskManager({
  initialTasks,
  artists,
  releases,
}: {
  initialTasks: Array<OpsTask & { id: string; artist_name?: string | null; release_title?: string | null }>;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function quickStatus(taskId: string, status: string) {
    await fetch("/api/ops-tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId, status }),
    });
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    await fetch("/api/ops-tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: taskId }),
    });
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  const editing = tasks.find((t) => t.id === editingId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        <button onClick={() => setCreating(true)}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90">
          + New Task
        </button>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCreating(false)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">New Ops Task</h2>
            <OpsTaskForm artists={artists} releases={releases} onClose={() => setCreating(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingId(null)}>
          <div className="bg-card rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Task</h2>
            <OpsTaskForm initial={editing} artists={artists} releases={releases} onClose={() => setEditingId(null)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {STATUS_COLUMNS.map((col) => {
          const items = tasks.filter((t) => (t.status || "todo") === col.key);
          return (
            <div key={col.key} className="bg-muted/30 rounded-xl border border-border p-3 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-muted-foreground">{items.length}</span>
              </div>
              {!items.length ? (
                <p className="text-xs text-muted-foreground italic">No tasks</p>
              ) : (
                items
                  .sort((a, b) => {
                    const pa = a.priority || "P2";
                    const pb = b.priority || "P2";
                    if (pa !== pb) return pa.localeCompare(pb);
                    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
                    return 0;
                  })
                  .map((t) => (
                    <div key={t.id} className="p-3 bg-card rounded-lg border border-border space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm flex-1">{t.task_name}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${PRIORITY_COLORS[t.priority || "P2"]}`}>
                          {t.priority}
                        </span>
                      </div>
                      {t.next_action && <p className="text-xs text-foreground italic">→ {t.next_action}</p>}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {t.due_date && <span>📅 {t.due_date}</span>}
                        {t.owner && <span>👤 {t.owner}</span>}
                      </div>
                      {(t.artist_name || t.release_title) && (
                        <div className="flex items-center gap-1 text-xs">
                          {t.artist_name && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">{t.artist_name}</span>}
                          {t.release_title && <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">{t.release_title}</span>}
                        </div>
                      )}
                      <div className="flex gap-1 pt-1">
                        {STATUS_COLUMNS.filter((s) => s.key !== col.key).map((s) => (
                          <button key={s.key} onClick={() => quickStatus(t.id!, s.key)}
                            className="text-xs px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700">
                            → {s.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-1 pt-1 border-t border-border">
                        <button onClick={() => setEditingId(t.id!)}
                          className="text-xs px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-foreground flex-1">Edit</button>
                        <button onClick={() => deleteTask(t.id!)}
                          className="text-xs px-2 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 flex-1">Delete</button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
