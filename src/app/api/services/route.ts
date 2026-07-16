import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { getServicesForUser, createServiceForUser } from "@/lib/services";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  const services = await getServicesForUser(userId);
  return NextResponse.json({ services });
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const b = await req.json();
  if (!b.name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  const service = await createServiceForUser(userId, {
    name: b.name.trim(),
    description: b.description?.trim() || null,
    price_cents: Math.max(0, Math.round(b.price_cents ?? 0)),
    currency: b.currency || "EUR",
    duration_min: b.duration_min ? Math.round(b.duration_min) : null,
    category: b.category?.trim() || null,
    active: b.active ?? true,
  });
  return NextResponse.json({ service });
});
