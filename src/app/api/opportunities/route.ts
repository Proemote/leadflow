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
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const b = await req.json();
    if (!b.title?.trim()) {
      return NextResponse.json({ error: "El título es obligatorio." }, { status: 400 });
    }

    // Permite crear un contacto nuevo al vuelo
    let contactId: string | null = b.contact_id || null;
    if (!contactId && b.new_contact_name?.trim()) {
      const c = await createContact({ name: b.new_contact_name.trim() });
      contactId = c.id;
    }

    const value_cents =
      typeof b.value_cents === "number" ? b.value_cents : parsePriceToCents(String(b.value ?? ""));

    const opportunity = await createOpportunity({
      title: b.title.trim(),
      contact_id: contactId,
      value_cents,
      probability: Number(b.probability ?? 50),
      stage: (b.stage as PipelineStage) ?? "Nuevo",
      expected_close: b.expected_close || null,
      owner: b.owner?.trim() || null,
      last_activity: b.last_activity?.trim() || null,
    });
    return NextResponse.json({ opportunity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
