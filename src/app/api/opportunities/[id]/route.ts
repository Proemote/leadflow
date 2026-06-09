import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateOpportunity, deleteOpportunity } from "@/lib/opportunities";
import { PipelineStage } from "@/lib/types";

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
  for (const k of ["title", "contact_id", "value_cents", "probability", "stage", "expected_close", "owner", "last_activity"]) {
    if (k in b) patch[k] = b[k];
  }
  const result = await updateOpportunity(id, patch as { stage?: PipelineStage });
  return NextResponse.json(result);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const { id } = await ctx.params;
  await deleteOpportunity(id);
  return NextResponse.json({ ok: true });
}
