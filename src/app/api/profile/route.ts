import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { setProfile } from "@/lib/profile";

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
  await setProfile({
    name: String(b.name).trim(),
    role: String(b.role ?? "").trim(),
    email: String(b.email ?? "").trim(),
  });
  return NextResponse.json({ ok: true });
}
