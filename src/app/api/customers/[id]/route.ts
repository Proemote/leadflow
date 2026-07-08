import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateContact } from "@/lib/customers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const { id } = await ctx.params;
    const b = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["name", "phone", "email", "company", "tags", "notes", "journey_stage"]) {
      if (k in b) patch[k] = b[k];
    }
    const contact = await updateContact(id, patch);
    return NextResponse.json({ contact });
  } catch (err) {
    console.error("[PATCH /api/customers/[id]]", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
