import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error("SUPABASE_URL is required");
if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY is required");

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
    if (init?.method && init.method !== "GET" && init.method !== "HEAD") {
      headers.set("Content-Profile", "label_suite");
    }
    return baseFetch(url, { ...init, headers });
  };
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  db: { schema: "label_suite" },
  global: { headers: schemaHeaders, fetch: customFetch() },
});

export const supabaseAdmin = createClient(supabaseUrl!, supabaseServiceKey!, {
  db: { schema: "label_suite" },
  global: { headers: schemaHeaders, fetch: customFetch() },
});
