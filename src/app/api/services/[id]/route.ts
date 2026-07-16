import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateServiceForUser, deleteServiceForUser } from "@/lib/services";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const id = req.nextUrl.pathname.split("/").pop()!;
  const b = await req.json();
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "description", "price_cents", "currency", "duration_min", "category", "active"]) {
    if (k in b) patch[k] = b[k];
  }
  const service = await updateServiceForUser(userId, id, patch);
  return NextResponse.json({ service });
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const id = req.nextUrl.pathname.split("/").pop()!;
  await deleteServiceForUser(userId, id);
  return NextResponse.json({ ok: true });
});
