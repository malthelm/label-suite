import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY is required");

// Public client (respects RLS, uses label_suite schema)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "label_suite" },
});

// Admin client (bypasses RLS, server-only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: "label_suite" },
});
