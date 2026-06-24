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
import { supabaseAdmin } from "./supabase";

export async function generateISRC(
  year?: number,
  prefix = "DKO7P",
): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const yearCode = String(y).slice(-2);

  // Get or create the sequence for this year
  const { data: existing } = await supabaseAdmin
    .from("isrc_sequences")
    .select("*")
    .eq("year", y)
    .single();

  let nextNum: number;
  let sequenceId: string;

  if (existing) {
    nextNum = existing.last_production_number + 1;
    sequenceId = existing.id;
    await supabaseAdmin
      .from("isrc_sequences")
      .update({ last_production_number: nextNum })
      .eq("id", sequenceId);
  } else {
    nextNum = 1;
    sequenceId = crypto.randomUUID();
    await supabaseAdmin
      .from("isrc_sequences")
      .insert({
        id: sequenceId,
        year: y,
        last_production_number: nextNum,
        prefix,
      });
  }

  const designation = String(nextNum).padStart(5, "0");
  return `${prefix}${yearCode}${designation}`;
}

/**
 * Assign ISRCs to all tracks on a release that don"t have one.
 * Also assigns to the linked work if it doesn"t have one.
 */
export async function assignISRCsToRelease(releaseId: string): Promise<number> {
  const { data: tracks } = await supabaseAdmin
    .from("tracks")
    .select("id, work_id, isrc")
    .eq("release_id", releaseId);

  if (!tracks?.length) return 0;

  let assigned = 0;
  for (const track of tracks) {
    if (track.isrc) continue; // Already has one

    const isrc = await generateISRC();
    await supabaseAdmin
      .from("tracks")
      .update({ isrc })
      .eq("id", track.id);

    // Also assign to work if it doesn"t have an ISRC
    if (track.work_id) {
      const { data: work } = await supabaseAdmin
        .from("works")
        .select("isrc")
        .eq("id", track.work_id)
        .single();

      if (work && !work.isrc) {
        await supabaseAdmin
          .from("works")
          .update({ isrc })
          .eq("id", track.work_id);
      }
    }

    assigned++;
  }

  return assigned;
}
