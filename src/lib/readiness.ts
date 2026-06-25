import { db, pool } from "./db";
import { tracks, releases, roles, bugs } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Compute readiness for a single track.
 */
export async function computeTrackReadiness(trackId: string): Promise<{
  isReady: boolean;
  missing: string[];
}> {
  const rows = await db.select().from(tracks).where(eq(tracks.id, trackId));
  const track = rows[0];
  if (!track) return { isReady: false, missing: ["Track not found"] };

  const missing: string[] = [];
  if (!track.isrc) missing.push("ISRC");
  if (!track.audio_url) missing.push("Audio file");
  if ((track.clearance_progress ?? 0) < 1.0) missing.push("Clearance");

  return { isReady: missing.length === 0, missing };
}

/**
 * Persist track readiness back to the DB.
 */
export async function persistTrackReadiness(trackId: string): Promise<void> {
  const { isReady, missing } = await computeTrackReadiness(trackId);
  await db.update(tracks).set({
    track_ready: isReady,
    track_missing: missing.length ? missing.join(", ") : null,
    updated_at: new Date(),
  }).where(eq(tracks.id, trackId));
}

/**
 * Compute release readiness by aggregating all tracks.
 */
export async function computeReleaseReadiness(releaseId: string): Promise<{
  isReady: boolean;
  missing: string[];
}> {
  const releaseRows = await db.select().from(releases).where(eq(releases.id, releaseId));
  const release = releaseRows[0];
  if (!release) return { isReady: false, missing: ["Release not found"] };

  const missing: string[] = [];
  if (!release.upc_ean) missing.push("UPC/EAN");
  if (!release.cover_art_url) missing.push("Cover art");
  if (!release.release_date) missing.push("Release date");

  const trackRows = await db.select().from(tracks).where(eq(tracks.release_id, releaseId));
  for (const t of trackRows) {
    const tr = await computeTrackReadiness(t.id);
    if (!tr.isReady) missing.push(...tr.missing.map((m) => `Track "${t.title}": ${m}`));
  }

  if (!trackRows.length) missing.push("No tracks");

  return { isReady: missing.length === 0, missing };
}

/**
 * Persist release readiness back to the DB.
 */
export async function persistReleaseReadiness(releaseId: string): Promise<void> {
  const { isReady, missing } = await computeReleaseReadiness(releaseId);
  await db.update(releases).set({
    release_ready: isReady,
    release_missing: missing.length ? missing.join(", ") : null,
    updated_at: new Date(),
  }).where(eq(releases.id, releaseId));
}

/**
 * Compute clearance progress from roles for a work.
 * Returns 0..1 (weighted: Signed=1.0, Confirmed=0.75, Pending=0.25, Unknown=0).
 */
export async function computeClearanceProgress(workId: string): Promise<number> {
  const roleRows = await db.select().from(roles).where(eq(roles.work_id, workId));
  if (!roleRows.length) return 0;

  const weightMap: Record<string, number> = {
    Signed: 1.0, Confirmed: 0.75, Pending: 0.25, Unknown: 0,
  };

  let totalWeighted = 0;
  let totalShares = 0;
  for (const r of roleRows) {
    const share = r.percent_share ?? 0;
    const weight = weightMap[r.clearance_status ?? "Unknown"] ?? 0;
    totalWeighted += share * weight;
    totalShares += share;
  }

  return totalShares > 0 ? Math.round((totalWeighted / totalShares) * 100) / 100 : 0;
}

/**
 * Persist clearance progress to all tracks linked to a work.
 */
export async function persistClearanceProgress(workId: string): Promise<void> {
  const progress = await computeClearanceProgress(workId);
  const trackRows = await db.select().from(tracks).where(eq(tracks.work_id, workId));
  for (const t of trackRows) {
    await db.update(tracks).set({
      clearance_progress: progress,
      updated_at: new Date(),
    }).where(eq(tracks.id, t.id));
    // Re-persist track readiness since clearance changed
    await persistTrackReadiness(t.id);
  }
}

/**
 * Run validation sweep — idempotent bug generation + self-healing closure.
 * Creates/updates bugs for current issues, closes bugs whose conditions are resolved.
 */
export async function runValidationSweep(): Promise<{ created: number; closed: number }> {
  let created = 0;
  let closed = 0;

  const trackRows = await db.select().from(tracks);
  const currentBugKeys = new Set<string>();

  for (const t of trackRows) {
    if (!t.isrc) {
      const key = `isrc-missing-${t.id}`;
      currentBugKeys.add(key);
      await db.insert(bugs).values({
        id: key, bug_key: key, title: "Track missing ISRC",
        description: `Track "${t.title}" has no ISRC.`, priority: "P1",
        status: "logged", auto_generated: true, source_table: "tracks", source_record_id: t.id,
      }).onConflictDoUpdate({
        target: bugs.bug_key,
        set: { status: "logged", updated_at: new Date() },
      });
      created++;
    }
    if (!t.audio_url) {
      const key = `audio-missing-${t.id}`;
      currentBugKeys.add(key);
      await db.insert(bugs).values({
        id: key, bug_key: key, title: "Track missing audio",
        description: `Track "${t.title}" has no audio file.`, priority: "P0",
        status: "logged", auto_generated: true, source_table: "tracks", source_record_id: t.id,
      }).onConflictDoUpdate({
        target: bugs.bug_key,
        set: { status: "logged", updated_at: new Date() },
      });
      created++;
    }
  }

  // Close auto-generated bugs whose condition no longer holds
  const autoBugs = await db.select().from(bugs).where(and(
    eq(bugs.auto_generated, true),
    eq(bugs.status, "logged"),
  ));

  for (const b of autoBugs) {
    if (b.bug_key && !currentBugKeys.has(b.bug_key)) {
      await db.update(bugs).set({ status: "done", updated_at: new Date() }).where(eq(bugs.id, b.id));
      closed++;
    }
  }

  return { created, closed };
}
