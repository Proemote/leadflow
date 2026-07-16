import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { addOperationForUser } from "@/lib/customers";
import { parsePriceToCents } from "@/lib/money";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const b = await req.json();
  if (!b.contact_id || !b.concept?.trim()) {
    return NextResponse.json({ error: "contact_id y concepto son obligatorios." }, { status: 400 });
  }
  const amount_cents =
    typeof b.amount_cents === "number" ? b.amount_cents : parsePriceToCents(String(b.amount ?? ""));

  const operation = await addOperationForUser(userId, {
    contact_id: b.contact_id,
    concept: b.concept.trim(),
    amount_cents,
    status: b.status,
    date: b.date,
  });
  return NextResponse.json({ operation });
});
