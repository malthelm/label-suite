"use client";

import { useState } from "react";

export interface OpsTask {
  id?: string;
  task_name?: string;
  status?: string;
  priority?: string;
  owner?: string | null;
  due_date?: string | null;
  linked_artist_id?: string | null;
  linked_release_id?: string | null;
  notes?: string | null;
  next_action?: string | null;
}

export function OpsTaskForm({
  initial,
  artists,
  releases,
  onClose,
}: {
  initial?: OpsTask | null;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [taskName, setTaskName] = useState(initial?.task_name || "");
  const [status, setStatus] = useState(initial?.status || "todo");
  const [priority, setPriority] = useState(initial?.priority || "P2");
  const [owner, setOwner] = useState(initial?.owner || "");
  const [dueDate, setDueDate] = useState(initial?.due_date || "");
  const [artistId, setArtistId] = useState(initial?.linked_artist_id || "");
  const [releaseId, setReleaseId] = useState(initial?.linked_release_id || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [nextAction, setNextAction] = useState(initial?.next_action || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload: Record<string, any> = {
        task_name: taskName,
        status,
        priority,
        owner: owner || null,
        due_date: dueDate || null,
        linked_artist_id: artistId || null,
        linked_release_id: releaseId || null,
        notes: notes || null,
        next_action: nextAction || null,
      };
      const res = await fetch("/api/ops-tasks", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...payload, id: initial!.id } : payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} task`);
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
        <label className="block text-sm font-medium text-foreground mb-1">Task Name *</label>
        <input
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background">
            <option value="P0">P0 — Critical</option>
            <option value="P1">P1 — High</option>
            <option value="P2">P2 — Normal</option>
            <option value="P3">P3 — Low</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Owner</label>
          <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Who owns this?"
            className="w-full px-3 py-2 border border-input rounded-lg text-sm bg-background" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Due Date</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
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
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Next Action</label>
        <input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="What's the immediate next step?"
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
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
        </button>
      </div>
    </form>
  );
}
