import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabase = (() => {
  if (!isSupabaseConfigured()) return null;
  const { createClient } = require("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
})();

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
    for (const k of ["concept", "amount_cents", "status"]) {
      if (k in b) patch[k] = b[k];
    }
    const { data, error } = await supabase.from("operations").update(patch).eq("id", id).select().single();
    if (error) throw error;
    return NextResponse.json({ operation: data });
  } catch (err) {
    console.error("[PATCH /api/operations/[id]]", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const { id } = await ctx.params;
    await supabase.from("operations").delete().eq("id", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/operations/[id]]", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
