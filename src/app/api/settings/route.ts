import { NextRequest, NextResponse } from "next/server";
import { setSetting, isSupabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Guarda el system prompt de Leo: { system_prompt } */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase no configurado: no se puede persistir el prompt." },
      { status: 400 }
    );
  }
  const { system_prompt } = await req.json();
  if (typeof system_prompt !== "string" || !system_prompt.trim()) {
    return NextResponse.json({ error: "system_prompt requerido" }, { status: 400 });
  }
  await setSetting("system_prompt", system_prompt.trim());
  return NextResponse.json({ ok: true });
}
