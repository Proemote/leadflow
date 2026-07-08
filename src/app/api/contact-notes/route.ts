import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 400 }
      );
    }

    const contactId = String(b.contact_id || "").trim();
    const content = String(b.content || "").trim();

    if (!contactId || !content) {
      return NextResponse.json(
        { error: "contact_id y content son obligatorios" },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from("contact_notes")
      .insert({ contact_id: contactId, content })
      .select()
      .single();

    if (error) {
      console.error("[contact-notes POST] Error:", error);
      return NextResponse.json({ error: "Error al crear nota" }, { status: 500 });
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : String(err);
    console.error("[contact-notes POST] Error:", message);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const noteId = url.searchParams.get("id");

    if (!noteId) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    const { error } = await sb
      .from("contact_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      console.error("[contact-notes DELETE] Error:", error);
      return NextResponse.json({ error: "Error al eliminar nota" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[contact-notes DELETE] Error:", message);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
