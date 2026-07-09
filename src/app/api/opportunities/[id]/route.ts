import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateOpportunity, deleteOpportunity } from "@/lib/opportunities";
import { createContact } from "@/lib/customers";
import { PipelineStage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as Record<string, unknown>).message);
  return JSON.stringify(err);
}

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
    for (const k of ["title", "contact_id", "value_cents", "probability", "stage", "expected_close", "owner", "last_activity"]) {
      if (k in b) patch[k] = b[k];
    }

    // Crear nuevo contacto si es necesario (cuando se edita una oportunidad y se crea un contacto nuevo)
    let newContact = null;
    if (!patch.contact_id && b.new_contact_name) {
      const newContactName = String(b.new_contact_name).trim();
      if (!newContactName) {
        return NextResponse.json({ error: "Nombre del nuevo contacto vacío" }, { status: 400 });
      }
      try {
        newContact = await createContact({ name: newContactName });
        patch.contact_id = newContact.id;
      } catch (err) {
        const errMessage = err instanceof Error ? err.message : "No se pudo crear el contacto";
        console.error("[PATCH /api/opportunities/[id]] createContact error:", err);
        return NextResponse.json({ error: `Error al crear contacto: ${errMessage}` }, { status: 500 });
      }
    }

    const result = await updateOpportunity(id, patch as { stage?: PipelineStage });
    return NextResponse.json({ opportunity: result.opportunity, newContact });
  } catch (err) {
    console.error("[PATCH /api/opportunities/[id]]", err);
    return NextResponse.json({ error: errMsg(err) || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const { id } = await ctx.params;
    await deleteOpportunity(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/opportunities/[id]]", err);
    return NextResponse.json({ error: errMsg(err) || "Error interno" }, { status: 500 });
  }
}
