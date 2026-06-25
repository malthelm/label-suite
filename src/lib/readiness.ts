import { db } from "./db";
import { tracks, releases, roles, bugs, works } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Per-scope clearance result for a work.
 * Only `ownership_type='Rights'` lines count toward clearance — Credit lines are excluded.
 */
export interface ScopeClearance {
  /** Sum of percent_share across Rights lines in this scope */
  enteredTotal: number;
  /** Sum of percent_share × statusWeight across Rights lines in this scope */
  weightedTotal: number;
  /**
   * Progress toward clearance: weightedTotal / 100 (0..1 range, may exceed 1 if overallocated).
   * This reflects both whether enough shares have been entered (~100%) AND
   * whether all entered shares have high clearance status (Signed/Confirmed).
   */
  progress: number;
  /** True when progress >= 1.0 (all shares accounted for and signed/confirmed) */
  cleared: boolean;
}

/** Full clearance result for a work (Publishing + Master universes). */
export interface WorkClearance {
  pub: ScopeClearance;
  master: ScopeClearance;
  /** Minimum of all applicable scopes' progress (0..1). If no scopes applicable, 0. */
  overall: number;
  /**
   * True when EVERY applicable scope is cleared.
   * If there are zero Rights lines across all scopes, returns false.
   */
  cleared: boolean;
}

/**
 * Compute clearance progress for a work, split by scope (Publishing vs Master).
 *
 * Rules:
 * - `ownership_type='Credit'` lines are excluded entirely (credit-only, no clearance weight).
 * - `Mechanical` scope rolls into Publishing.
 * - A scope with NO Rights lines is "not applicable" — does NOT block clearance.
 * - Overall progress = MIN of applicable scopes' progress.
 * - If zero Rights lines anywhere → cleared = false.
 * - percent_share is on a 0–100 scale.
 */
export async function computeClearanceProgress(workId: string): Promise<WorkClearance> {
  const roleRows = await db.select().from(roles).where(eq(roles.work_id, workId));
  // Only Rights lines count toward clearance; Credit lines are credit-only
  const rightsRows = roleRows.filter((r) => r.ownership_type !== "Credit");

  const weightMap: Record<string, number> = {
    Signed: 1.0,
    Confirmed: 0.75,
    Pending: 0.25,
    Unknown: 0,
  };

  // Mechanical rolls into Publishing
  const pubRows = rightsRows.filter(
    (r) => r.scope === "Publishing" || r.scope === "Mechanical",
  );
  const masterRows = rightsRows.filter((r) => r.scope === "Master");

  const computeScope = (rows: typeof roleRows): ScopeClearance => {
    if (rows.length === 0) {
      // No Rights lines in this scope → not applicable, treat as cleared
      return { enteredTotal: 0, weightedTotal: 0, progress: 1, cleared: true };
    }
    let totalWeighted = 0;
    let totalShares = 0;
    for (const r of rows) {
      const share = r.percent_share ?? 0;
      const weight = weightMap[r.clearance_status ?? "Unknown"] ?? 0;
      totalWeighted += share * weight;
      totalShares += share;
    }
    // progress = weightedTotal / 100 (normalized against the 100% expectation)
    const progress =
      Math.round((totalWeighted / 100) * 10000) / 10000;
    return {
      enteredTotal: Math.round(totalShares * 100) / 100,
      weightedTotal: Math.round(totalWeighted * 100) / 100,
      progress,
      cleared: progress >= 1.0,
    };
  };

  const pub = computeScope(pubRows);
  const master = computeScope(masterRows);

  // Determine applicable scopes (those with at least one Rights line)
  const applicable = [];
  if (pubRows.length > 0) applicable.push(pub);
  if (masterRows.length > 0) applicable.push(master);

  const overall =
    applicable.length > 0
      ? Math.min(...applicable.map((s) => s.progress))
      : 0;

  // If zero Rights lines across all scopes → cleared = false
  const cleared = rightsRows.length > 0 && applicable.every((s) => s.cleared);

  return { pub, master, overall, cleared };
}

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

  // Use stored clearance columns (written by persistClearanceProgress).
  // clearance_progress is the overall min of applicable scopes.
  if (track.work_id) {
    if ((track.clearance_progress ?? 0) < 1.0) {
      if ((track.clearance_pub ?? 0) < 1.0) {
        missing.push(
          `Publishing clearance ${Math.round((track.clearance_pub ?? 0) * 100)}%`,
        );
      }
      if ((track.clearance_master ?? 0) < 1.0) {
        missing.push(
          `Master clearance ${Math.round((track.clearance_master ?? 0) * 100)}%`,
        );
      }
      // Both scopes show as "not applicable" but zero rights lines exist
      if (
        (track.clearance_pub ?? 0) >= 1.0 &&
        (track.clearance_master ?? 0) >= 1.0
      ) {
        missing.push("Clearance required — no rights entered");
      }
    }
  } else {
    missing.push("Work assignment");
  }

  return { isReady: missing.length === 0, missing };
}

/**
 * Persist track readiness back to the DB.
 */
export async function persistTrackReadiness(trackId: string): Promise<void> {
  const { isReady, missing } = await computeTrackReadiness(trackId);
  await db
    .update(tracks)
    .set({
      track_ready: isReady,
      track_missing: missing.length ? missing.join(", ") : null,
      updated_at: new Date(),
    })
    .where(eq(tracks.id, trackId));
}

/**
 * Compute release readiness by aggregating all tracks.
 */
export async function computeReleaseReadiness(releaseId: string): Promise<{
  isReady: boolean;
  missing: string[];
}> {
  const releaseRows = await db
    .select()
    .from(releases)
    .where(eq(releases.id, releaseId));
  const release = releaseRows[0];
  if (!release) return { isReady: false, missing: ["Release not found"] };

  const missing: string[] = [];
  if (!release.upc_ean) missing.push("UPC/EAN");
  if (!release.cover_art_url) missing.push("Cover art");
  if (!release.release_date) missing.push("Release date");

  const trackRows = await db
    .select()
    .from(tracks)
    .where(eq(tracks.release_id, releaseId));
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
  await db
    .update(releases)
    .set({
      release_ready: isReady,
      release_missing: missing.length ? missing.join(", ") : null,
      updated_at: new Date(),
    })
    .where(eq(releases.id, releaseId));
}

/**
 * Persist clearance progress to all tracks linked to a work.
 * Writes 3 columns: clearance_pub, clearance_master, clearance_progress (overall min).
 * Also re-persists track readiness for each affected track.
 */
export async function persistClearanceProgress(workId: string): Promise<void> {
  const result = await computeClearanceProgress(workId);
  const trackRows = await db
    .select()
    .from(tracks)
    .where(eq(tracks.work_id, workId));
  for (const t of trackRows) {
    await db
      .update(tracks)
      .set({
        clearance_pub: result.pub.progress,
        clearance_master: result.master.progress,
        clearance_progress: result.overall,
        updated_at: new Date(),
      })
      .where(eq(tracks.id, t.id));
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
  const trackRows = await db
    .select()
    .from(tracks)
    .where(eq(tracks.work_id, workId));
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
  const autoBugs = await db
    .select()
    .from(bugs)
    .where(and(eq(bugs.auto_generated, true), eq(bugs.status, "logged")));

  for (const b of autoBugs) {
    if (b.bug_key && !currentBugKeys.has(b.bug_key)) {
      await db
        .update(bugs)
        .set({ status: "done", updated_at: new Date() })
        .where(eq(bugs.id, b.id));
      closed++;
    }
  }

  const openBugs = await db
    .select()
    .from(bugs)
    .where(and(eq(bugs.auto_generated, true), eq(bugs.status, "logged")));

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
  opts: {
    title: string;
    description: string;
    priority: string;
    sourceTable: string;
    sourceRecordId: string;
  },
): Promise<boolean> {
  // Check if bug already exists
  const existing = await db
    .select()
    .from(bugs)
    .where(eq(bugs.bug_key, key));
  const existed = existing.length > 0;

  if (existed) {
    // Re-open if it was closed
    await db
      .update(bugs)
      .set({
        status: "logged",
        updated_at: new Date(),
      })
      .where(eq(bugs.bug_key, key));
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
