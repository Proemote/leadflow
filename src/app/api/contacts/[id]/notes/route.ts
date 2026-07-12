import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;

    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("contact_notes")
      .select()
      .eq("contact_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[contact notes GET] Error:", error);
      return NextResponse.json({ error: "Error al cargar notas" }, { status: 500 });
    }

    return NextResponse.json({ notes: data || [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[contact notes GET] Error:", message);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
