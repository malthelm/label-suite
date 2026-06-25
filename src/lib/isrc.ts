/**
 * ISRC auto-generation utility.
 *
 * ISRC format (ISO 3901): CC-XXX-YY-NNNNN
 *   CC = country code (DK for Denmark)
 *   XXX = registrant code (O7P for True Nature)
 *   YY = last two digits of year
 *   NNNNN = 5-digit unique designation
 *
 * Default prefix: DKO7P (True Nature Records)
 */
import { db } from "./db";
import { isrc_sequences, tracks, works } from "../db/schema";
import { eq } from "drizzle-orm";

export async function generateISRC(
  year?: number,
  prefix = "DKO7P",
): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const yearCode = String(y).slice(-2);

  const existing = await db.select().from(isrc_sequences).where(eq(isrc_sequences.year, y));
  let nextNum: number;
  let sequenceId: string;

  if (existing.length > 0) {
    nextNum = (existing[0].last_production_number ?? 0) + 1;
    sequenceId = existing[0].id;
    await db.update(isrc_sequences).set({ last_production_number: nextNum }).where(eq(isrc_sequences.id, sequenceId));
  } else {
    nextNum = 1;
    sequenceId = crypto.randomUUID();
    await db.insert(isrc_sequences).values({
      id: sequenceId, year: y, last_production_number: nextNum, prefix,
    });
  }

  const designation = String(nextNum).padStart(5, "0");
  return `${prefix}${yearCode}${designation}`;
}

/**
 * Assign ISRCs to all tracks on a release that don't have one.
 * Also assigns to the linked work if it doesn't have one.
 */
export async function assignISRCsToRelease(releaseId: string): Promise<number> {
  const trackRows = await db.select().from(tracks).where(eq(tracks.release_id, releaseId));
  if (!trackRows.length) return 0;

  let assigned = 0;
  for (const track of trackRows) {
    if (track.isrc) continue;

    const isrc = await generateISRC();
    await db.update(tracks).set({ isrc }).where(eq(tracks.id, track.id));

    if (track.work_id) {
      const workRows = await db.select().from(works).where(eq(works.id, track.work_id));
      if (workRows[0] && !workRows[0].isrc) {
        await db.update(works).set({ isrc }).where(eq(works.id, track.work_id));
      }
    }
    assigned++;
  }

  return assigned;
}
