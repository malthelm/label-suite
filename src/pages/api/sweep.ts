import type { APIRoute } from "astro";
import { runValidationSweep } from "../../lib/readiness";

export const prerender = false;

export const POST: APIRoute = async () => {
  try {
    const result = await runValidationSweep();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
