import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function readEnv(name: string) {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v : undefined;
}

/**
 * Server-side Supabase client.
 *
 * IMPORTANT:
 * - Do NOT create the client at module import time, because missing envs would crash the whole route
 *   and Next.js would return an HTML 500 page (breaking the frontend JSON parsing).
 * - This function throws a clear error message if required env vars are missing.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = readEnv("SUPABASE_URL") ?? readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") ?? readEnv("SUPABASE_SERVICE_KEY");
  const anonKey = readEnv("SUPABASE_ANON_KEY") ?? readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const key = serviceKey ?? anonKey;

  if (!url) {
    throw new Error(
      "Missing Supabase URL. Set SUPABASE_URL (recommended) or NEXT_PUBLIC_SUPABASE_URL."
    );
  }
  if (!key) {
    throw new Error(
      "Missing Supabase key. Set SUPABASE_SERVICE_ROLE_KEY (recommended) or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
