import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { createOpportunity } from "@/lib/opportunities";
import { createContact } from "@/lib/customers";
import { parsePriceToCents } from "@/lib/money";
import { PipelineStage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido en el cuerpo de la solicitud" }, { status: 400 });
    }

    if (!String(b.title || "").trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
    }

    const value_cents =
      typeof b.value_cents === "number" ? b.value_cents : parsePriceToCents(String(b.value ?? ""));

    // Permite crear un contacto nuevo al vuelo
    // Nunca pasar "__new__" como UUID a Supabase
    let contactId: string | null = (b.contact_id && b.contact_id !== "__new__") ? (b.contact_id as string) : null;
    if (!contactId && b.new_contact_name) {
      const newContactName = String(b.new_contact_name).trim();
      if (!newContactName) {
        return NextResponse.json({ error: "Nombre del nuevo contacto vacío" }, { status: 400 });
      }
      try {
        const c = await createContact({ name: newContactName });
        contactId = c.id;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "No se pudo crear el contacto";
        console.error("[POST /api/opportunities] createContact error:", err);
        return NextResponse.json({ error: `Error al crear contacto: ${errMsg}` }, { status: 500 });
      }
    }

    // Modo demo: devolver oportunidad simulada
    if (!isSupabaseConfigured()) {
      const opportunity = {
        id: `tmp-${Date.now()}`,
        title: String(b.title).trim(),
        contact_id: contactId,
        value_cents,
        currency: "EUR",
        probability: Number(b.probability ?? 50),
        stage: (b.stage as PipelineStage) ?? "Nuevo",
        expected_close: (b.expected_close as string | null) || null,
        owner: (b.owner as string | null)?.trim() || null,
        last_activity: (b.last_activity as string | null)?.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return NextResponse.json({ opportunity, newContact: b.new_contact_name ? { id: contactId, name: String(b.new_contact_name).trim() } : null });
    }

    const opportunity = await createOpportunity({
      title: String(b.title).trim(),
      contact_id: contactId,
      value_cents,
      probability: Number(b.probability ?? 50),
      stage: (b.stage as PipelineStage) ?? "Nuevo",
      expected_close: (b.expected_close as string | null) || null,
      owner: (b.owner as string | null)?.trim() || null,
      last_activity: (b.last_activity as string | null)?.trim() || null,
    });
    return NextResponse.json({
      opportunity,
      newContact: b.new_contact_name ? { id: contactId, name: String(b.new_contact_name).trim() } : null,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as Record<string, unknown>).message)
        : String(err);
    console.error("[POST /api/opportunities] Error:", err);
    return NextResponse.json({ error: message || "Error interno del servidor" }, { status: 500 });
  }
}
