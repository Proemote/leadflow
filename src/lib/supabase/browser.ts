"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Cliente de navegador para auth (magic link). */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
