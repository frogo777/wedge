/**
 * Service-role Supabase client.
 *
 * Only import this from server-only code (API routes, server actions, cron).
 * Requires `SUPABASE_SERVICE_ROLE_KEY` to be set. Returns `null` if the key
 * is missing so callers can degrade gracefully rather than crashing at boot.
 */

import "server-only";
import { createClient as createRawClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function createServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (_client) return _client;
  _client = createRawClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
