import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY is required");

// Self-hosted Supabase without Kong: PostgREST serves directly at the root.
// The Supabase client normally appends /rest/v1/ — we strip it.
// We also inject Content-Profile for writes and Accept-Profile for reads.
const schemaHeaders = {
  "Accept-Profile": "label_suite",
  "Content-Profile": "label_suite",
};

function customFetch(baseFetch = globalThis.fetch) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = typeof input === "string" ? input : input.toString();
    url = url.replace("/rest/v1", "");
    const headers = new Headers(init?.headers);
    headers.set("Accept-Profile", "label_suite");
    // Content-Profile for writes (INSERT/UPDATE/DELETE go to label_suite)
    if (init?.method && init.method !== "GET" && init.method !== "HEAD") {
      headers.set("Content-Profile", "label_suite");
    }
    return baseFetch(url, { ...init, headers });
  };
}

// Public client (respects RLS)
export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  db: { schema: "label_suite" },
  global: { headers: schemaHeaders, fetch: customFetch() },
});

// Admin client (bypasses RLS, server-only)
export const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  db: { schema: "label_suite" },
  global: { headers: schemaHeaders, fetch: customFetch() },
});
