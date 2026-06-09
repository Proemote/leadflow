import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { addOperation } from "@/lib/customers";
import { parsePriceToCents } from "@/lib/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const b = await req.json();
  if (!b.contact_id || !b.concept?.trim()) {
    return NextResponse.json({ error: "contact_id y concepto son obligatorios." }, { status: 400 });
  }
  const amount_cents =
    typeof b.amount_cents === "number" ? b.amount_cents : parsePriceToCents(String(b.amount ?? ""));

  const operation = await addOperation({
    contact_id: b.contact_id,
    concept: b.concept.trim(),
    amount_cents,
    status: b.status,
    date: b.date,
  });
  return NextResponse.json({ operation });
}
