import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateService, deleteService } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const { id } = await ctx.params;
  const b = await req.json();
  const patch: Record<string, unknown> = {};
  for (const k of ["name", "description", "price_cents", "currency", "duration_min", "category", "active"]) {
    if (k in b) patch[k] = b[k];
  }
  const service = await updateService(id, patch);
  return NextResponse.json({ service });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const { id } = await ctx.params;
  await deleteService(id);
  return NextResponse.json({ ok: true });
}
