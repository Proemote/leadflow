import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { setBusinessConfig } from "@/lib/business";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const b = await req.json();
  await setBusinessConfig({
    businessType: b.businessType,
    openHours: b.openHours,
    slotMin: b.slotMin,
  });
  return NextResponse.json({ ok: true });
}
