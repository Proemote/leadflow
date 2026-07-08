import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { assignService } from "@/lib/contactServices";
import { ContactServiceStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as Record<string, unknown>).message);
  return JSON.stringify(err);
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const b = await req.json();
    if (!b.contact_id) return NextResponse.json({ error: "Falta el contacto." }, { status: 400 });
    if (!b.service_id) return NextResponse.json({ error: "Elige un servicio." }, { status: 400 });
    const contactService = await assignService({
      contact_id: b.contact_id,
      service_id: b.service_id,
      status: (b.status as ContactServiceStatus) ?? "contratado",
      notes: b.notes?.trim() || null,
    });
    return NextResponse.json({ contactService });
  } catch (err) {
    console.error("[POST /api/contact-services]", err);
    return NextResponse.json({ error: errMsg(err) || "Error interno" }, { status: 500 });
  }
}
