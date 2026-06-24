import "dotenv/config";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres.supabase:***@100.92.149.28:6543/postgres",
});

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.PUBLIC_SITE_URL || "http://localhost:4321",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  trustedOrigins: [
    "http://localhost:4321",
    "https://label-suite.truenature.online",
  ],
});
