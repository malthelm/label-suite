import { pgTable, text, integer, real, timestamp, boolean, jsonb, pgSchema, date } from "drizzle-orm/pg-core";

// All tables in label_suite schema (keeps separation from techrider's public schema)
const schema = pgSchema("label_suite");

// ─── Contacts ───────────────────────────────────────────
export const contacts = schema.table("contacts", {
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
export const artists = schema.table("artists", {
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
export const releases = schema.table("releases", {
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
export const works = schema.table("works", {
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
export const tracks = schema.table("tracks", {
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
  clearance_pub: real("clearance_pub").default(0),
  clearance_master: real("clearance_master").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Roles (Credit) ─────────────────────────────────────
export const roles = schema.table("roles", {
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
export const budget_categories = schema.table("budget_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"), // marketing, a_and_r, manufacturing, etc.
});

export const budget_line_items = schema.table("budget_line_items", {
  id: text("id").primaryKey(),
  release_id: text("release_id").references(() => releases.id),
  category_id: text("category_id").references(() => budget_categories.id),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  status: text("status").default("pending"), // pending, approved, paid
  created_at: timestamp("created_at").defaultNow(),
});

// ─── Calls (Today Hub) ──────────────────────────────────
export const calls = schema.table("calls", {
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
export const dsp_pitches = schema.table("dsp_pitches", {
  id: text("id").primaryKey(),
  release_id: text("release_id").references(() => releases.id),
  platform: text("platform"), // Spotify, Apple Music, etc.
  status: text("status").default("draft"), // draft, sent, responded, approved
  sent_date: timestamp("sent_date"),
  response: text("response"),
  created_at: timestamp("created_at").defaultNow(),
});

// ─── Bugs (Auto-validation) ─────────────────────────────
export const bugs = schema.table("bugs", {
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
export const isrc_sequences = schema.table("isrc_sequences", {
  id: text("id").primaryKey(),
  year: integer("year").notNull().unique(),
  last_production_number: integer("last_production_number").default(0),
  prefix: text("prefix").default("DKO7P"), // DK registrant code
});

// ─── Campaigns ──────────────────────────────────────────
export const campaigns = schema.table("campaigns", {
  id: text("id").primaryKey(),
  campaign_name: text("campaign_name").notNull(),
  linked_release_id: text("linked_release_id").references(() => releases.id),
  linked_artist_id: text("linked_artist_id").references(() => artists.id),
  campaign_type: text("campaign_type"),
  start_date: text("start_date"),
  end_date: text("end_date"),
  status: text("status").default("planning"),
  owner: text("owner"),
  goal: text("goal"),
  budget_planned: real("budget_planned"),
  budget_actual: real("budget_actual"),
  kpi_summary: text("kpi_summary"),
  notes: text("notes"),
  performance_rating: integer("performance_rating"),
  main_platform: text("main_platform"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Radio Stations ─────────────────────────────────────
export const radio_stations = schema.table("radio_stations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  call_sign: text("call_sign"),
  frequency: text("frequency"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  dj_name: text("dj_name"),
  tier: text("tier"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Campaign Stations (join table) ─────────────────────
export const campaign_stations = schema.table("campaign_stations", {
  id: text("id").primaryKey(),
  campaign_id: text("campaign_id").references(() => campaigns.id),
  station_id: text("station_id").references(() => radio_stations.id),
  status: text("status").default("pending"),
});

// ─── Media Assets ───────────────────────────────────────
export const media_assets = schema.table("media_assets", {
  id: text("id").primaryKey(),
  asset_name: text("asset_name").notNull(),
  asset_type: text("asset_type"),
  linked_artist_id: text("linked_artist_id").references(() => artists.id),
  linked_release_id: text("linked_release_id").references(() => releases.id),
  version: text("version"),
  approval_status: text("approval_status").default("pending"),
  delivery_status: text("delivery_status").default("not_sent"),
  file_link: text("file_link"),
  notes: text("notes"),
  date_uploaded: date("date_uploaded"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Documents ─────────────────────────────────────────
export const documents = schema.table("documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  doc_type: text("doc_type"),
  release_id: text("release_id").references(() => releases.id),
  artist_id: text("artist_id").references(() => artists.id),
  contact_id: text("contact_id").references(() => contacts.id),
  status: text("status").default("draft"),
  file_link: text("file_link"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

// ─── Side Artists ──────────────────────────────────────
export const side_artists = schema.table("side_artists", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  artist_id: text("artist_id").references(() => artists.id),
  release_id: text("release_id").references(() => releases.id),
  type: text("type"),
  created_at: timestamp("created_at").defaultNow(),
});

// ─── Royalties / Revenue ────────────────────────────────
export const royalties_revenue = schema.table("royalties_revenue", {
  id: text("id").primaryKey(),
  record_name: text("record_name").notNull(),
  statement_period: text("statement_period"),
  source: text("source"),
  artist_id: text("artist_id").references(() => artists.id),
  release_id: text("release_id").references(() => releases.id),
  gross_revenue: real("gross_revenue"),
  costs: real("costs"),
  net_revenue: real("net_revenue"),
  paid_out: text("paid_out").default("unpaid"),
  payment_date: text("payment_date"),
  notes: text("notes"),
  revenue_type: text("revenue_type"),
  revenue_month: text("revenue_month"),
  source_contact_id: text("source_contact_id").references(() => contacts.id),
  payment_method: text("payment_method"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});
