import { supabaseAdmin } from "./supabase";
import type { components } from "./db/schema";

export interface ReadinessGate {
  pass: boolean;
  label: string;
  missing: string;
}

/**
 * Compute readiness for a single track.
 */
export async function computeTrackReadiness(trackId: string): Promise<{
  isReady: boolean;
  missing: string[];
}> {
  const { data: track } = await supabaseAdmin
    .from("tracks")
    .select("id, isrc, audio_url, clearance_progress")
    .eq("id", trackId)
    .single();

  if (!track) return { isReady: false, missing: ["Track not found"] };

  const missing: string[] = [];
  if (!track.isrc) missing.push("ISRC");
  if (!track.audio_url) missing.push("Audio file");
  if ((track.clearance_progress ?? 0) < 1.0) missing.push("Clearance");

  return {
    isReady: missing.length === 0,
    missing,
  };
}

/**
 * Compute release readiness by aggregating all tracks.
 */
export async function computeReleaseReadiness(releaseId: string): Promise<{
  isReady: boolean;
  missing: string[];
}> {
  const { data: release } = await supabaseAdmin
    .from("releases")
    .select("id, upc_ean, cover_art_url, release_date")
    .eq("id", releaseId)
    .single();

  if (!release) return { isReady: false, missing: ["Release not found"] };

  const missing: string[] = [];
  if (!release.upc_ean) missing.push("UPC/EAN");
  if (!release.cover_art_url) missing.push("Cover art");
  if (!release.release_date) missing.push("Release date");

  // Check all tracks
  const { data: tracks } = await supabaseAdmin
    .from("tracks")
    .select("id, isrc, audio_url, clearance_progress")
    .eq("release_id", releaseId);

  let tracksReady = 0;
  for (const t of tracks ?? []) {
    const tr = await computeTrackReadiness(t.id);
    if (!tr.isReady) missing.push(...tr.missing.map((m) => `Track "${t.id}": ${m}`));
    else tracksReady++;
  }

  if (!tracks?.length) missing.push("No tracks");

  return {
    isReady: missing.length === 0,
    missing,
  };
}

/**
 * Compute clearance progress from roles for a track/work.
 */
export async function computeClearanceProgress(workId: string): Promise<number> {
  const { data: roles } = await supabaseAdmin
    .from("roles")
    .select("percent_share, clearance_status, scope")
    .eq("work_id", workId);

  if (!roles?.length) return 0;

  const weightMap: Record<string, number> = {
    Signed: 1.0,
    Confirmed: 0.75,
    Pending: 0.25,
    Unknown: 0,
  };

  let totalWeighted = 0;
  let totalShares = 0;

  for (const r of roles) {
    const share = r.percent_share ?? 0;
    const weight = weightMap[r.clearance_status ?? "Unknown"] ?? 0;
    totalWeighted += share * weight;
    totalShares += share;
  }

  return totalShares > 0 ? Math.round((totalWeighted / totalShares) * 100) / 100 : 0;
}

/**
 * Run validation sweep — idempotent bug generation.
 */
export async function runValidationSweep(): Promise<number> {
  let bugsCreated = 0;

  const { data: tracks } = await supabaseAdmin.from("tracks").select("id, isrc, audio_url, clearance_progress");
  for (const t of tracks ?? []) {
    const bugs: Array<{ bug_key: string; title: string; description: string; priority: string }> = [];
    if (!t.isrc) bugs.push({ bug_key: `isrc-missing-${t.id}`, title: "Track missing ISRC", description: `Track ${t.id} has no ISRC.`, priority: "P1" });
    if (!t.audio_url) bugs.push({ bug_key: `audio-missing-${t.id}`, title: "Track missing audio", description: `Track ${t.id} has no audio file.`, priority: "P0" });

    for (const b of bugs) {
      await supabaseAdmin.from("bugs").upsert({
        id: b.bug_key,
        bug_key: b.bug_key,
        title: b.title,
        description: b.description,
        priority: b.priority,
        status: "logged",
        auto_generated: true,
        source_table: "tracks",
        source_record_id: t.id,
      }, { onConflict: "bug_key" });
      bugsCreated++;
    }
  }

  return bugsCreated;
}
