"use client";

import { useState } from "react";

export interface Campaign {
  id: string;
  campaign_name: string;
  linked_release_id?: string | null;
  linked_artist_id?: string | null;
  campaign_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  owner?: string | null;
  goal?: string | null;
  budget_planned?: number | null;
  budget_actual?: number | null;
  kpi_summary?: string | null;
  notes?: string | null;
  performance_rating?: number | null;
  main_platform?: string | null;
}

export function CampaignForm({
  initial,
  onClose,
  releases,
  artists,
}: {
  initial?: Campaign | null;
  onClose: () => void;
  releases?: Array<{ id: string; title: string }>;
  artists?: Array<{ id: string; name: string }>;
}) {
  const isEdit = !!initial;
  const [campaignName, setCampaignName] = useState(initial?.campaign_name || "");
  const [linkedReleaseId, setLinkedReleaseId] = useState(initial?.linked_release_id || "");
  const [linkedArtistId, setLinkedArtistId] = useState(initial?.linked_artist_id || "");
  const [campaignType, setCampaignType] = useState(initial?.campaign_type || "");
  const [startDate, setStartDate] = useState(initial?.start_date || "");
  const [endDate, setEndDate] = useState(initial?.end_date || "");
  const [status, setStatus] = useState(initial?.status || "planning");
  const [owner, setOwner] = useState(initial?.owner || "");
  const [goal, setGoal] = useState(initial?.goal || "");
  const [budgetPlanned, setBudgetPlanned] = useState(initial?.budget_planned?.toString() || "");
  const [budgetActual, setBudgetActual] = useState(initial?.budget_actual?.toString() || "");
  const [kpiSummary, setKpiSummary] = useState(initial?.kpi_summary || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [performanceRating, setPerformanceRating] = useState(initial?.performance_rating?.toString() || "");
  const [mainPlatform, setMainPlatform] = useState(initial?.main_platform || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, any> = {
        campaign_name: campaignName,
        linked_release_id: linkedReleaseId || null,
        linked_artist_id: linkedArtistId || null,
        campaign_type: campaignType || null,
        start_date: startDate || null,
        end_date: endDate || null,
        status,
        owner: owner || null,
        goal: goal || null,
        budget_planned: budgetPlanned ? Number(budgetPlanned) : null,
        budget_actual: budgetActual ? Number(budgetActual) : null,
        kpi_summary: kpiSummary || null,
        notes: notes || null,
        performance_rating: performanceRating ? Number(performanceRating) : null,
        main_platform: mainPlatform || null,
      };
      const res = await fetch("/api/campaigns", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...body, id: initial!.id } : body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} campaign`);
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
        <label className="block text-sm font-medium text-foreground mb-1">Campaign Name *</label>
        <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required
          className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Campaign Type</label>
          <select value={campaignType} onChange={(e) => setCampaignType(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— Select —</option>
            <option value="pre-release">Pre-release</option>
            <option value="release">Release</option>
            <option value="sustain">Sustain</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="planning">Planning</option>
            <option value="active">Active</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Linked Release</label>
          <select value={linkedReleaseId} onChange={(e) => setLinkedReleaseId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— None —</option>
            {(releases || []).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Linked Artist</label>
          <select value={linkedArtistId} onChange={(e) => setLinkedArtistId(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— None —</option>
            {(artists || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Owner</label>
          <input value={owner} onChange={(e) => setOwner(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Main Platform</label>
          <select value={mainPlatform} onChange={(e) => setMainPlatform(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="">— Select —</option>
            <option value="Spotify">Spotify</option>
            <option value="Apple Music">Apple Music</option>
            <option value="TikTok">TikTok</option>
            <option value="Instagram">Instagram</option>
            <option value="Radio">Radio</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Goal</label>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2}
          className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Budget Planned</label>
          <input type="number" step="0.01" value={budgetPlanned} onChange={(e) => setBudgetPlanned(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Budget Actual</label>
          <input type="number" step="0.01" value={budgetActual} onChange={(e) => setBudgetActual(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Performance (1-10)</label>
          <input type="number" min="1" max="10" value={performanceRating} onChange={(e) => setPerformanceRating(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">KPI Summary</label>
        <input value={kpiSummary} onChange={(e) => setKpiSummary(e.target.value)}
          className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
          className="w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        <button type="submit" disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/80 disabled:opacity-50">
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Campaign"}
        </button>
      </div>
    </form>
  );
}