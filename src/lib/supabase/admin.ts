import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente admin (service_role) — SOLO en el servidor.
 * Bypassa RLS. Nunca importar desde un componente cliente.
 */
let cached: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function supabaseAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase no está configurado: faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  if (!cached) {
    cached = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return cached;
}
