import type { Config } from "drizzle-kit";
import "dotenv/config";

// Direct Postgres connection to Winona Supabase via Tailscale
const dbUrl = `postgres://postgres.${process.env.SUPABASE_URL?.replace("http://", "").replace(":3000", "")}:6543/postgres`;

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || dbUrl,
  },
} satisfies Config;
