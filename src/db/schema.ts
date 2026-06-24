import { pgTable, text, integer, real, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";

// ─── Contacts ───────────────────────────────────────────
export const contacts = pgTable("contacts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role"), // e.g. Manager, Lawyer, PR, Distributor
  company: text("company"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Artists ────────────────────────────────────────────
export const artists = pgTable("artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  bio: text("bio"),
  spotify_id: text("spotify_id"),
  spotify_followers: integer("spotify_followers"),
  spotify_popularity: integer("spotify_popularity"),
  pro: text("pro"), // ASCAP, KODA, SOCAN, etc.
  ipi: text("ipi"),
  instagram: text("instagram"),
  tiktok: text("tiktok"),
  contact_id: text("contact_id").references(() => contacts.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Releases ───────────────────────────────────────────
export const releases = pgTable("releases", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  artist_id: text("artist_id").references(() => artists.id),
  release_date: text("release_date"),
  format: text("format"), // single, EP, album
  upc_ean: text("upc_ean"),
  cover_art_url: text("cover_art_url"),
  status: text("status").default("draft"), // draft, scheduled, released, archived
  delivery_status: text("delivery_status"),
  exploitation_scope: text("exploitation_scope"),
  notes: text("notes"),
  // Computed fields (cached from validation)
  release_ready: boolean("release_ready").default(false),
  release_missing: text("release_missing"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── WORKS (stable recording identity) ──────────────────
export const works = pgTable("works", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  isrc: text("isrc"),
  iswc: text("iswc"),
  audio_url: text("audio_url"),
  duration: integer("duration"), // seconds
  genre: text("genre"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Tracks ─────────────────────────────────────────────
export const tracks = pgTable("tracks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  release_id: text("release_id").references(() => releases.id),
  work_id: text("work_id").references(() => works.id),
  position: integer("position"), // track number on release
  version: text("version"), // main, remix, acoustic, etc.
  isrc: text("isrc"),
  audio_url: text("audio_url"),
  duration: integer("duration"),
  // Computed
  track_ready: boolean("track_ready").default(false),
  track_missing: text("track_missing"),
  clearance_progress: real("clearance_progress").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Roles (Credit) ─────────────────────────────────────
export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  contact_id: text("contact_id").references(() => contacts.id),
  work_id: text("work_id").references(() => works.id),
  role: text("role"), // Producer, Songwriter, Vocalist, etc.
  ownership_type: text("ownership_type"), // Rights, Credit
  scope: text("scope"), // Publishing, Master, Mechanical
  percent_share: real("percent_share"),
  clearance_status: text("clearance_status"), // Signed, Confirmed, Pending, Unknown
  reviewed_by: text("reviewed_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Budget ─────────────────────────────────────────────
export const budget_categories = pgTable("budget_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"), // marketing, a_and_r, manufacturing, etc.
});

export const budget_line_items = pgTable("budget_line_items", {
  id: text("id").primaryKey(),
  release_id: text("release_id").references(() => releases.id),
  category_id: text("category_id").references(() => budget_categories.id),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  status: text("status").default("pending"), // pending, approved, paid
  created_at: timestamp("created_at").defaultNow(),
});

// ─── Calls (Today Hub) ──────────────────────────────────
export const calls = pgTable("calls", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  contact_id: text("contact_id").references(() => contacts.id),
  release_id: text("release_id").references(() => releases.id),
  start: timestamp("start"),
  end: timestamp("end"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
});

// ─── DSP Pitches ────────────────────────────────────────
export const dsp_pitches = pgTable("dsp_pitches", {
  id: text("id").primaryKey(),
  release_id: text("release_id").references(() => releases.id),
  platform: text("platform"), // Spotify, Apple Music, etc.
  status: text("status").default("draft"), // draft, sent, responded, approved
  sent_date: timestamp("sent_date"),
  response: text("response"),
  created_at: timestamp("created_at").defaultNow(),
});

// ─── Bugs (Auto-validation) ─────────────────────────────
export const bugs = pgTable("bugs", {
  id: text("id").primaryKey(),
  bug_key: text("bug_key").unique(), // canonical dedup key
  source_table: text("source_table"),
  source_record_id: text("source_record_id"),
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("P2"), // P0, P1, P2, P3
  status: text("status").default("logged"), // logged, triaged, in_progress, done
  auto_generated: boolean("auto_generated").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── ISRC Sequences ─────────────────────────────────────
export const isrc_sequences = pgTable("isrc_sequences", {
  id: text("id").primaryKey(),
  year: integer("year").notNull().unique(),
  last_production_number: integer("last_production_number").default(0),
  prefix: text("prefix").default("DKO7P"), // DK registrant code
});
