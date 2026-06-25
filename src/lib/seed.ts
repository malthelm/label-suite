import crypto from "crypto";
import { db } from "./db";
import {
  artists,
  contacts,
  releases,
  tracks,
  works,
  roles,
  budget_categories,
  budget_line_items,
  calls,
  dsp_pitches,
} from "../db/schema";
import { generateISRC } from "./isrc";
import { runValidationSweep } from "./readiness";

// ─── IDs we track for rollback ───────────────────────────
const insertedIds: { table: string; id: string }[] = [];
function track(table: string, id: string) {
  insertedIds.push({ table, id });
}

// ─── Helpers ─────────────────────────────────────────────
function uid(): string {
  return crypto.randomUUID();
}

async function safeInsert(table: string, stmt: any, values: any) {
  await db.insert(stmt).values(values);
  if (values.id) track(table, values.id);
}

// ─── Main seed function ──────────────────────────────────
export async function main() {
  console.log("🌱 Seeding Label Suite with Danish music label data...\n");

  // ==================================================================
  // 1. CONTACTS (8) – created BEFORE artists so artist.contact_id works
  // ==================================================================
  const contactData = [
    { name: "Mette Holm",        email: "mette@northstar.dk",        phone: "+45 20 10 30 40", role: "Manager",      company: "North Star Management" },
    { name: "Rasmus Berg",       email: "rasmus@koda.dk",           phone: "+45 31 22 44 55", role: "PRO Rep",      company: "KODA" },
    { name: "Sofie Lund",        email: "sofie@lundlaw.dk",         phone: "+45 40 55 66 77", role: "Lawyer",       company: "Lund & Partnere" },
    { name: "Anders Dahl",       email: "anders@dahlpub.com",       phone: "+45 22 33 44 55", role: "Publisher",    company: "Dahl Music Publishing" },
    { name: "Lene Bach",         email: "lene@nordicdistro.com",    phone: "+45 25 35 45 55", role: "Distributor",  company: "Nordic Distro" },
    { name: "Torben Kruse",      email: "torben@kruse-mgmt.dk",     phone: "+45 28 39 50 61", role: "Manager",      company: "Kruse Artist Services" },
    { name: "Ida Sørensen",      email: "ida@soundpr.dk",           phone: "+45 23 44 56 78", role: "PR",           company: "Sound PR Agency" },
    { name: "Frederik Thomsen",  email: "frederik@sonic.dk",        phone: "+45 27 38 49 50", role: "A&R",          company: "Sonic Records A&R" },
  ];

  const contactIds: Record<string, string> = {};
  for (const c of contactData) {
    const id = uid();
    contactIds[c.name] = id;
    await safeInsert("contacts", contacts, { id, ...c, notes: null });
  }

  // ==================================================================
  // 2. ARTISTS (5)
  // ==================================================================
  const artistData = [
    {
      name: "Lykke Strand",
      bio: "Indie pop singer-songwriter from Aarhus with a dreamy, ethereal sound.",
      spotify_followers: 45200,
      spotify_popularity: 58,
      pro: "KODA",
      ipi: "00123456789",
      instagram: "@lykkestrand",
      tiktok: "@lykkestrand",
      contact_id: contactIds["Mette Holm"],
    },
    {
      name: "Mikkel b2b",
      bio: "Copenhagen-based electronic producer blending house, techno, and ambient.",
      spotify_followers: 18700,
      spotify_popularity: 42,
      pro: "KODA",
      ipi: "00134567890",
      instagram: "@mikkelb2b",
      tiktok: "@mikkelb2b",
      contact_id: contactIds["Torben Kruse"],
    },
    {
      name: "Fenja",
      bio: "Indie folk-pop duo with haunting harmonies and poetic Danish lyrics.",
      spotify_followers: 81500,
      spotify_popularity: 64,
      pro: "KODA",
      ipi: "00145678901",
      instagram: "@fenjamusik",
      tiktok: "@fenjamusik",
      contact_id: contactIds["Mette Holm"],
    },
    {
      name: "Villads Himmel",
      bio: "Danish hip-hop artist known for introspective lyrics and lo-fi beats.",
      spotify_followers: 123400,
      spotify_popularity: 71,
      pro: "KODA",
      ipi: "00156789012",
      instagram: "@villadshimmel",
      tiktok: "@villadshimmel",
      contact_id: contactIds["Torben Kruse"],
    },
    {
      name: "The Gentle Noise",
      bio: "Experimental indie-electronic collective from Copenhagen.",
      spotify_followers: 29300,
      spotify_popularity: 49,
      pro: "KODA",
      ipi: "00167890123",
      instagram: "@thegentlenoise",
      tiktok: "@thegentlenoise",
      contact_id: contactIds["Frederik Thomsen"],
    },
  ];

  const artistIds: Record<string, string> = {};
  for (const a of artistData) {
    const id = uid();
    artistIds[a.name] = id;
    await safeInsert("artists", artists, { id, ...a });
  }

  // ==================================================================
  // 3. RELEASES (3)
  // ==================================================================
  const releaseData = [
    {
      title: "Neon Hjerte",
      artist_id: artistIds["Lykke Strand"],
      release_date: "2026-03-15",
      format: "single",
      upc_ean: "5701234567891",
      cover_art_url: "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800",
      status: "released",
      delivery_status: "delivered",
      exploitation_scope: "worldwide",
      notes: "Lead single from upcoming sophomore EP.",
    },
    {
      title: "Stille Vand",
      artist_id: artistIds["Fenja"],
      release_date: "2026-09-01",
      format: "EP",
      upc_ean: "5701234567892",
      cover_art_url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800",
      status: "scheduled",
      delivery_status: "mastered",
      exploitation_scope: "worldwide",
      notes: "Debut EP – 4 tracks exploring stillness and nature.",
    },
    {
      title: "Brudstykker",
      artist_id: artistIds["Villads Himmel"],
      release_date: "2026-11-20",
      format: "album",
      upc_ean: "5701234567893",
      cover_art_url: null,
      status: "draft",
      delivery_status: "recording",
      exploitation_scope: "worldwide",
      notes: "Full-length debut album. Still in production.",
    },
  ];

  const releaseIds: Record<string, string> = {};
  for (const r of releaseData) {
    const id = uid();
    releaseIds[r.title] = id;
    await safeInsert("releases", releases, { id, ...r });
  }

  // ==================================================================
  // 4. TRACKS + WORKS + ROLES
  // ==================================================================

  const trackConfigs: Record<string, { trackTitle: string; version?: string; duration: number; genre: string; iswc?: string }[]> = {
    "Neon Hjerte": [
      { trackTitle: "Neon Hjerte",        version: "main",          duration: 218, genre: "Indie Pop", iswc: "T-123456789-0" },
      { trackTitle: "Neon Hjerte (Akustisk)", version: "acoustic",  duration: 195, genre: "Indie Pop", iswc: "T-123456789-1" },
    ],
    "Stille Vand": [
      { trackTitle: "Stille Vand",        version: "main",          duration: 242, genre: "Folk Pop", iswc: "T-123456790-0" },
      { trackTitle: "Sommerfugl",         version: "main",          duration: 207, genre: "Folk Pop", iswc: "T-123456790-1" },
      { trackTitle: "Regnvejr",           version: "main",          duration: 195, genre: "Folk Pop", iswc: "T-123456790-2" },
      { trackTitle: "Havblik",            version: "main",          duration: 264, genre: "Folk Pop", iswc: "T-123456790-3" },
    ],
    "Brudstykker": [
      { trackTitle: "Brudstykker",        version: "main",          duration: 203, genre: "Hip-Hop", iswc: "T-123456791-0" },
      { trackTitle: "Mørke Timer",        version: "main",          duration: 228, genre: "Hip-Hop", iswc: "T-123456791-1" },
      { trackTitle: "Lys i Mørket",       version: "main",          duration: 197, genre: "Hip-Hop", iswc: "T-123456791-2" },
      { trackTitle: "Byens Larm",         version: "main",          duration: 215, genre: "Hip-Hop", iswc: "T-123456791-3" },
      { trackTitle: "Ensomhed",           version: "main",          duration: 241, genre: "Hip-Hop", iswc: "T-123456791-4" },
      { trackTitle: "Håb",                version: "main",          duration: 189, genre: "Hip-Hop", iswc: "T-123456791-5" },
      { trackTitle: "Drømme",             version: "main",          duration: 233, genre: "Hip-Hop", iswc: "T-123456791-6" },
      { trackTitle: "Frihed",             version: "main",          duration: 256, genre: "Hip-Hop", iswc: "T-123456791-7" },
    ],
  };

  // Role templates: which contacts play which roles on which releases
  const roleTemplates: Record<string, { producer: string; songwriter: string[] }> = {
    "Neon Hjerte": {
      producer: "Mette Holm",    // manager doubling as producer for simplicity
      songwriter: ["Lykke Strand (the artist)", "Rasmus Berg"],
    },
    "Stille Vand": {
      producer: "Anders Dahl",
      songwriter: ["Fenja (the artist)", "Ida Sørensen"],
    },
    "Brudstykker": {
      producer: "Torben Kruse",
      songwriter: ["Villads Himmel (the artist)", "Frederik Thomsen", "Lene Bach"],
    },
  };

  // Map artist names + contact names to actual contacts for roles
  // We need "Lykke Strand (the artist)" etc. to resolve to the artist's linked contact, or a new contact
  // For simplicity, we'll create the roles as: one Producer role (contact-based) and one Songwriter role (contact-based)
  // per work. We'll split shares realistically.

  for (const releaseName of Object.keys(trackConfigs)) {
    const tracksForRelease = trackConfigs[releaseName];
    const releaseId = releaseIds[releaseName];

    for (let i = 0; i < tracksForRelease.length; i++) {
      const t = tracksForRelease[i];
      const workId = uid();
      const trackId = uid();

      // Generate ISRC
      const isrc = await generateISRC();

      // Create work
      await safeInsert("works", works, {
        id: workId,
        title: t.trackTitle,
        isrc,
        iswc: t.iswc ?? null,
        audio_url: `https://audio.nouslabel.dk/${releaseName.toLowerCase().replace(/\s+/g, "-")}/${i + 1}_${t.trackTitle.toLowerCase().replace(/\s+/g, "-")}.mp3`,
        duration: t.duration,
        genre: t.genre,
      });

      // Create track
      await safeInsert("tracks", tracks, {
        id: trackId,
        title: t.trackTitle,
        release_id: releaseId,
        work_id: workId,
        position: i + 1,
        version: t.version ?? "main",
        isrc,
        audio_url: null, // explicit: no audio uploaded yet (except for released)
        duration: t.duration,
      });

      // Create roles for this work
      const tmpl = roleTemplates[releaseName];
      const producerContactName = tmpl.producer;
      const songwriterContactNames = tmpl.songwriter;

      // Producer role: 40-50% share
      const producerShare = releaseName === "Neon Hjerte" ? 40 : releaseName === "Stille Vand" ? 45 : 50;
      const producerContactId = contactIds[producerContactName];
      if (producerContactId) {
        await safeInsert("roles", roles, {
          id: uid(),
          contact_id: producerContactId,
          work_id: workId,
          role: "Producer",
          ownership_type: "Rights",
          scope: "Master",
          percent_share: producerShare,
          clearance_status: i === 0 ? "Signed" : "Pending", // first track signed, rest pending for variety
          reviewed_by: null,
        });
      }

      // Songwriter roles: split remaining share
      const remainingShare = 100 - producerShare;
      const sharePerSongwriter = Math.floor(remainingShare / songwriterContactNames.length);
      const remainder = remainingShare - sharePerSongwriter * songwriterContactNames.length;

      for (let j = 0; j < songwriterContactNames.length; j++) {
        const swName = songwriterContactNames[j];
        let contactId: string | undefined;

        // Determine if this is an artist reference or a contact
        if (swName.includes("(the artist)")) {
          // Use the linked contact for that artist
          const artistName = swName.replace(" (the artist)", "");
          const artistRecord = artistData.find(a => a.name === artistName);
          if (artistRecord) {
            contactId = contactIds[artistRecord.contact_id!];
          }
        } else {
          contactId = contactIds[swName];
        }

        if (contactId) {
          const share = j === songwriterContactNames.length - 1
            ? sharePerSongwriter + remainder
            : sharePerSongwriter;

          await safeInsert("roles", roles, {
            id: uid(),
            contact_id: contactId,
            work_id: workId,
            role: "Songwriter",
            ownership_type: "Rights",
            scope: "Publishing",
            percent_share: share,
            clearance_status: j === 0 ? "Signed" : "Pending",
            reviewed_by: null,
          });
        }
      }
    }
  }

  // ==================================================================
  // 5. BUDGET CATEGORIES + LINE ITEMS
  // ==================================================================

  // Create budget categories first
  const budgetCategoryData = [
    { name: "Marketing & PR",       type: "marketing" },
    { name: "Recording & Production", type: "a_and_r" },
    { name: "Manufacturing",        type: "manufacturing" },
    { name: "Distribution",         type: "distribution" },
    { name: "Video Production",     type: "marketing" },
  ];

  const budgetCatIds: Record<string, string> = {};
  for (const bc of budgetCategoryData) {
    const id = uid();
    budgetCatIds[bc.name] = id;
    await safeInsert("budget_categories", budget_categories, { id, ...bc });
  }

  const budgetLines: { releaseTitle: string; categoryName: string; name: string; amount: number; status: string }[] = [
    // Neon Hjerte (single) – 3 line items
    { releaseTitle: "Neon Hjerte", categoryName: "Recording & Production", name: "Studio time (Copenhagen)",                amount: 8500,  status: "paid" },
    { releaseTitle: "Neon Hjerte", categoryName: "Marketing & PR",        name: "Social media campaign",                    amount: 3200,  status: "approved" },
    { releaseTitle: "Neon Hjerte", categoryName: "Video Production",      name: "Lyric video",                              amount: 6000,  status: "paid" },
    // Stille Vand (EP) – 3 line items
    { releaseTitle: "Stille Vand", categoryName: "Recording & Production", name: "Studio sessions (5 days)",                amount: 15000, status: "approved" },
    { releaseTitle: "Stille Vand", categoryName: "Marketing & PR",        name: "Press kit + radio promo",                  amount: 5000,  status: "pending" },
    { releaseTitle: "Stille Vand", categoryName: "Distribution",           name: "Digital distribution (DistroKid annual)", amount: 1200,  status: "approved" },
    // Brudstykker (album) – 3 line items
    { releaseTitle: "Brudstykker", categoryName: "Recording & Production", name: "Studio time (12 days)",                   amount: 28000, status: "pending" },
    { releaseTitle: "Brudstykker", categoryName: "Manufacturing",          name: "Vinyl pressing (500 units)",              amount: 12000, status: "pending" },
    { releaseTitle: "Brudstykker", categoryName: "Marketing & PR",         name: "Album release campaign",                  amount: 10000, status: "pending" },
  ];

  for (const bl of budgetLines) {
    await safeInsert("budget_line_items", budget_line_items, {
      id: uid(),
      release_id: releaseIds[bl.releaseTitle],
      category_id: budgetCatIds[bl.categoryName],
      name: bl.name,
      amount: bl.amount,
      status: bl.status,
    });
  }

  // ==================================================================
  // 6. DSP PITCHES (2–3)
  // ==================================================================
  const dspData = [
    { releaseTitle: "Neon Hjerte", platform: "Spotify",       status: "approved",  sent_date: new Date("2026-02-01"), response: "✅ Added to 'New Music Friday Denmark' playlist" },
    { releaseTitle: "Neon Hjerte", platform: "Apple Music",   status: "responded", sent_date: new Date("2026-02-01"), response: "Under consideration for 'New Artist Spotlight'" },
    { releaseTitle: "Stille Vand", platform: "Spotify",       status: "sent",      sent_date: new Date("2026-08-15"), response: null },
  ];

  for (const d of dspData) {
    await safeInsert("dsp_pitches", dsp_pitches, {
      id: uid(),
      release_id: releaseIds[d.releaseTitle],
      platform: d.platform,
      status: d.status,
      sent_date: d.sent_date,
      response: d.response ?? null,
    });
  }

  // ==================================================================
  // 7. CALLS (2)
  // ==================================================================
  const callData = [
    {
      title: "Release strategy – Neon Hjerte",
      contact_id: contactIds["Mette Holm"],
      release_id: releaseIds["Neon Hjerte"],
      start: new Date("2026-01-20T14:00:00Z"),
      end: new Date("2026-01-20T14:45:00Z"),
      notes: "Discussed playlist pitching and press outreach. Mette to coordinate with Ida.",
    },
    {
      title: "Brudstykker production check-in",
      contact_id: contactIds["Frederik Thomsen"],
      release_id: releaseIds["Brudstykker"],
      start: new Date("2026-06-10T10:00:00Z"),
      end: new Date("2026-06-10T10:30:00Z"),
      notes: "Frederik reported 6/8 tracks complete. Need to book final studio sessions for August.",
    },
  ];

  for (const c of callData) {
    await safeInsert("calls", calls, {
      id: uid(),
      ...c,
    });
  }

  // ==================================================================
  // 8. RUN VALIDATION SWEEP
  // ==================================================================
  console.log("🔍 Running validation sweep...");
  const sweepResult = await runValidationSweep();
  console.log(`   ✅ Sweep complete:`);
  console.log(`      • Releases re-evaluated: ${sweepResult.releasesReevaluated}`);
  console.log(`      • Tracks re-evaluated:   ${sweepResult.tracksReevaluated}`);
  console.log(`      • Bugs created:          ${sweepResult.created}`);
  console.log(`      • Bugs closed:           ${sweepResult.closed}`);
  console.log(`      • Open issues:           ${sweepResult.openIssues}`);

  // ==================================================================
  // SUMMARY
  // ==================================================================
  console.log(`\n✅ Seeding complete!`);
  console.log(`   • ${artistData.length} artists created`);
  console.log(`   • ${contactData.length} contacts created`);
  console.log(`   • ${Object.values(trackConfigs).flat().length} tracks across ${releaseData.length} releases`);
  console.log(`   • ${budgetLines.length} budget line items`);
  console.log(`   • ${dspData.length} DSP pitches`);
  console.log(`   • ${callData.length} calls`);
  console.log(`\n📋 Inserted IDs tracked for rollback: ${insertedIds.length} rows\n`);

  return { sweepResult, insertedIds };
}

// ─── Run if called directly ──────────────────────────────
if (import.meta.url === new URL(import.meta.url).href || process.argv[1]?.endsWith("seed.ts")) {
  main()
    .then(() => {
      console.log("Seed script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed script failed:", err);
      process.exit(1);
    });
}