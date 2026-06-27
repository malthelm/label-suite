"use client";

import { useState } from "react";

const SOURCE_OPTIONS = ["Spotify", "Apple Music", "Tidal", "CD Baby", "DistroKid", "AWAL", "Other"];

const PAID_OUT_OPTIONS = ["unpaid", "pending", "paid"];

const REVENUE_TYPE_OPTIONS = ["streaming", "mechanical", "sync", "physical"];

export interface RoyaltyRecord {
  id: string;
  record_name: string;
  statement_period?: string | null;
  source?: string | null;
  artist_id?: string | null;
  release_id?: string | null;
  gross_revenue?: number | null;
  costs?: number | null;
  net_revenue?: number | null;
  paid_out?: string | null;
  payment_date?: string | null;
  notes?: string | null;
  revenue_type?: string | null;
  revenue_month?: string | null;
  source_contact_id?: string | null;
  payment_method?: string | null;
}

export function RoyaltyForm({
  initial,
  artists,
  releases,
  onClose,
}: {
  initial?: RoyaltyRecord | null;
  artists: Array<{ id: string; name: string }>;
  releases: Array<{ id: string; title: string }>;
  onClose: () => void;
}) {
  const isEdit = !!initial;
  const [recordName, setRecordName] = useState(initial?.record_name || "");
  const [statementPeriod, setStatementPeriod] = useState(initial?.statement_period || "");
  const [source, setSource] = useState(initial?.source || "");
  const [artistId, setArtistId] = useState(initial?.artist_id || "");
  const [releaseId, setReleaseId] = useState(initial?.release_id || "");
  const [grossRevenue, setGrossRevenue] = useState(initial?.gross_revenue?.toString() || "");
  const [costs, setCosts] = useState(initial?.costs?.toString() || "");
  const [paidOut, setPaidOut] = useState(initial?.paid_out || "unpaid");
  const [paymentDate, setPaymentDate] = useState(initial?.payment_date || "");
  const [revenueType, setRevenueType] = useState(initial?.revenue_type || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, any> = {
        record_name: recordName.trim(),
        statement_period: statementPeriod || null,
        source: source || null,
        artist_id: artistId || null,
        release_id: releaseId || null,
        gross_revenue: grossRevenue ? Number(grossRevenue) : null,
        costs: costs ? Number(costs) : null,
        paid_out: paidOut,
        payment_date: paymentDate || null,
        revenue_type: revenueType || null,
        notes: notes || null,
      };
      const res = await fetch("/api/royalties", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? { ...body, id: initial!.id } : body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `Failed to ${isEdit ? "update" : "create"} royalty record`);
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
        <label className="block text-sm font-medium text-neutral-700 mb-1">Record Name *</label>
        <input
          value={recordName}
          onChange={(e) => setRecordName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Statement Period</label>
          <input
            value={statementPeriod}
            onChange={(e) => setStatementPeriod(e.target.value)}
            placeholder="e.g. Q1 2025"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">— Select source —</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Artist</label>
          <select
            value={artistId}
            onChange={(e) => setArtistId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">— Select artist —</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Release</label>
          <select
            value={releaseId}
            onChange={(e) => setReleaseId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">— Select release —</option>
            {releases.map((r) => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Gross Revenue</label>
          <input
            type="number"
            step="0.01"
            value={grossRevenue}
            onChange={(e) => setGrossRevenue(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Costs</label>
          <input
            type="number"
            step="0.01"
            value={costs}
            onChange={(e) => setCosts(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Status</label>
          <select
            value={paidOut}
            onChange={(e) => setPaidOut(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            {PAID_OUT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Revenue Type</label>
          <select
            value={revenueType}
            onChange={(e) => setRevenueType(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
          >
            <option value="">— Select —</option>
            {REVENUE_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
          </select>
        </div>
        <div></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Royalty Record"}
        </button>
      </div>
    </form>
  );
}