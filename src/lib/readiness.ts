import { db, pool } from "./db";
import { tracks, releases, roles, bugs, works } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

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
 * Also re-persists track readiness for each affected track.
 */
export async function persistClearanceProgress(workId: string): Promise<void> {
  const progress = await computeClearanceProgress(workId);
  const trackRows = await db.select().from(tracks).where(eq(tracks.work_id, workId));
  for (const t of trackRows) {
    await db.update(tracks).set({
      clearance_progress: progress,
      updated_at: new Date(),
    }).where(eq(tracks.id, t.id));
    await persistTrackReadiness(t.id);
  }
}

/**
 * After a role mutation, persist clearance for the work, then
 * re-persist release readiness for every release that has a track
 * pointing at that work.
 */
export async function persistAfterRoleChange(workId: string): Promise<void> {
  await persistClearanceProgress(workId);
  const trackRows = await db.select().from(tracks).where(eq(tracks.work_id, workId));
  const releaseIds = new Set<string>();
  for (const t of trackRows) {
    if (t.release_id) releaseIds.add(t.release_id);
  }
  for (const rid of releaseIds) {
    await persistReleaseReadiness(rid);
  }
}

/**
 * Run validation sweep.
 *
 * 1. Recompute and persist clearance + readiness for all works and releases.
 * 2. Upsert bugs for current issues (idempotent via bug_key).
 * 3. Close auto-generated bugs whose conditions are resolved.
 *
 * Returns honest counts: `created` = truly new bugs inserted,
 * `openIssues` = total open auto-bugs after sweep, `closed` = bugs closed this run.
 */
export async function runValidationSweep(): Promise<{
  created: number;
  openIssues: number;
  closed: number;
  releasesReevaluated: number;
  tracksReevaluated: number;
}> {
  let created = 0;
  let closed = 0;
  let tracksReevaluated = 0;
  let releasesReevaluated = 0;

  // 1. Recompute clearance + readiness for all works and releases
  const workRows = await db.select().from(works);
  for (const w of workRows) {
    await persistClearanceProgress(w.id);
  }

  const trackRows = await db.select().from(tracks);
  tracksReevaluated = trackRows.length;
  for (const t of trackRows) {
    await persistTrackReadiness(t.id);
  }

  const releaseRows = await db.select().from(releases);
  releasesReevaluated = releaseRows.length;
  for (const r of releaseRows) {
    await persistReleaseReadiness(r.id);
  }

  // 2. Generate bugs for current issues (upsert by bug_key)
  const currentBugKeys = new Set<string>();

  for (const t of trackRows) {
    if (!t.isrc) {
      const key = `isrc-missing-${t.id}`;
      currentBugKeys.add(key);
      const existed = await upsertBug(key, {
        title: "Track missing ISRC",
        description: `Track "${t.title}" has no ISRC.`,
        priority: "P1",
        sourceTable: "tracks",
        sourceRecordId: t.id,
      });
      if (!existed) created++;
    }
    if (!t.audio_url) {
      const key = `audio-missing-${t.id}`;
      currentBugKeys.add(key);
      const existed = await upsertBug(key, {
        title: "Track missing audio",
        description: `Track "${t.title}" has no audio file.`,
        priority: "P0",
        sourceTable: "tracks",
        sourceRecordId: t.id,
      });
      if (!existed) created++;
    }
  }

  // 3. Close auto-generated bugs whose condition no longer holds
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

  const openBugs = await db.select().from(bugs).where(and(
    eq(bugs.auto_generated, true),
    eq(bugs.status, "logged"),
  ));

  return {
    created,
    openIssues: openBugs.length,
    closed,
    releasesReevaluated,
    tracksReevaluated,
  };
}

/**
 * Upsert a bug by bug_key. Returns true if the bug already existed (false if newly created).
 */
async function upsertBug(
  key: string,
  opts: { title: string; description: string; priority: string; sourceTable: string; sourceRecordId: string },
): Promise<boolean> {
  // Check if bug already exists
  const existing = await db.select().from(bugs).where(eq(bugs.bug_key, key));
  const existed = existing.length > 0;

  if (existed) {
    // Re-open if it was closed
    await db.update(bugs).set({
      status: "logged",
      updated_at: new Date(),
    }).where(eq(bugs.bug_key, key));
  } else {
    await db.insert(bugs).values({
      id: key,
      bug_key: key,
      title: opts.title,
      description: opts.description,
      priority: opts.priority,
      status: "logged",
      auto_generated: true,
      source_table: opts.sourceTable,
      source_record_id: opts.sourceRecordId,
    });
  }

  return existed;
}
