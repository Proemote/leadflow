import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { createContact } from "@/lib/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido en el cuerpo de la solicitud" }, { status: 400 });
  }

  if (!String(b.name || "").trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  try {
    const contact = await createContact({
      name: String(b.name).trim(),
      phone: b.phone ? String(b.phone).trim() || null : null,
      email: b.email ? String(b.email).trim() || null : null,
      company: b.company ? String(b.company).trim() || null : null,
      tags: Array.isArray(b.tags) ? b.tags : [],
      notes: b.notes ? String(b.notes).trim() || null : null,
    });
    return NextResponse.json({ contact });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/customers]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
