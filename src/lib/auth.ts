import "dotenv/config";
import { betterAuth } from "better-auth";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required. Set it in .env");
}

const pool = new Pool({ connectionString });

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
