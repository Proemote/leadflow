import { NextRequest, NextResponse } from "next/server";
import { setSetting, isSupabaseConfigured } from "@/lib/db";
import { INTERNAL_PROMPT_KEY } from "@/lib/leo-internal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Guarda los prompts de Leo. Acepta uno u otro (claves separadas):
 * - { system_prompt }  → bot de WhatsApp
 * - { internal_prompt } → asistente interno (Hablar con Leo)
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado: no se puede persistir el prompt." },
      { status: 400 }
    );
  }
  const { system_prompt, internal_prompt } = await req.json();

  if (typeof system_prompt === "string" && system_prompt.trim()) {
    await setSetting("system_prompt", system_prompt.trim());
    return NextResponse.json({ ok: true });
  }
  if (typeof internal_prompt === "string" && internal_prompt.trim()) {
    await setSetting(INTERNAL_PROMPT_KEY, internal_prompt.trim());
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json(
    { error: "system_prompt o internal_prompt requerido" },
    { status: 400 }
  );
}
