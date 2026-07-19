import { NextRequest, NextResponse } from "next/server";
import { generateInternalReply } from "@/lib/leo-internal";
import { getUserIdFromRequest } from "@/lib/api-auth";
import { isSupabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /asistente: chat interno de Carlos con Leo (solo lectura sobre el CRM).
 * Body: { messages: [{ role: "user"|"assistant", content }] }
 * Independiente de /api/chat (Leo cara a lead) y del webhook de WhatsApp.
 */
export async function POST(req: NextRequest) {
  // En modo demo (sin Supabase) las queries caen a datos de demostración.
  let userId = "";
  if (isSupabaseConfigured()) {
    try {
      userId = await getUserIdFromRequest(req);
    } catch {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
  }

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages requerido" }, { status: 400 });
    }
    const reply = await generateInternalReply(userId, messages);
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
