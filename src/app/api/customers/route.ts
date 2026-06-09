import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { createContact } from "@/lib/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const b = await req.json();
  if (!b.name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const contact = await createContact({
    name: b.name.trim(),
    phone: b.phone?.trim() || null,
    email: b.email?.trim() || null,
    company: b.company?.trim() || null,
    tags: Array.isArray(b.tags) ? b.tags : [],
    notes: b.notes?.trim() || null,
  });
  return NextResponse.json({ contact });
}
