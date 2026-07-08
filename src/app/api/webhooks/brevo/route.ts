import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BrevoWebhookPayload {
  email?: string;
  attributes?: Record<string, unknown>;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validar webhook secret
    const secret = req.headers.get("x-webhook-secret");
    const expectedSecret = process.env.BREVO_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("[BREVO WEBHOOK] BREVO_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (secret !== expectedSecret) {
      console.warn("[BREVO WEBHOOK] Invalid webhook secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parsear payload
    const body: BrevoWebhookPayload = await req.json();
    console.log("[BREVO WEBHOOK] Full payload received:", JSON.stringify(body, null, 2));

    // El email puede venir en "email" o en "contact.email" o "EMAIL" etc.
    let email = body.email?.toString().toLowerCase().trim() ||
                body.contact?.email?.toString().toLowerCase().trim() ||
                body.EMAIL?.toString().toLowerCase().trim() ||
                (body.attributes?.EMAIL)?.toString().toLowerCase().trim();

    if (!email) {
      console.warn("[BREVO WEBHOOK] Missing email in payload. Keys:", Object.keys(body));
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Extraer atributos de Brevo
    const attributes = (body.attributes || {}) as Record<string, unknown>;
    const planRecomendado = attributes.PLAN_RECOMENDADO
      ? String(attributes.PLAN_RECOMENDADO).trim()
      : null;
    const puntuacionGlobal = attributes.PUNTUACION_GLOBAL
      ? Math.floor(Number(attributes.PUNTUACION_GLOBAL))
      : null;
    const firstName = attributes.FIRSTNAME
      ? String(attributes.FIRSTNAME).trim()
      : null;
    const sector = attributes.SECTOR
      ? String(attributes.SECTOR).trim()
      : null;
    const ciudad = attributes.CIUDAD
      ? String(attributes.CIUDAD).trim()
      : null;

    console.log(
      `[BREVO WEBHOOK] Processing contact: ${email} (plan: ${planRecomendado})`
    );

    if (!isSupabaseConfigured()) {
      console.error("[BREVO WEBHOOK] Supabase not configured");
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      );
    }

    const sb = supabaseAdmin();

    // 3. Buscar contacto existente por email
    const { data: existingContact, error: selectError } = await sb
      .from("contacts")
      .select("id, name")
      .eq("email", email)
      .maybeSingle();

    if (selectError) {
      console.error("[BREVO WEBHOOK] Database select error:", selectError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    let contactId: string;
    let action: "created" | "updated";

    if (existingContact) {
      // Actualizar contacto existente
      const { data: updated, error: updateError } = await sb
        .from("contacts")
        .update({
          plan_recomendado: planRecomendado,
          puntuacion_global: puntuacionGlobal,
          ad_source: "diagnostico_digital",
          // Actualizar nombre si viene de Brevo
          ...(firstName && !existingContact.name && { name: firstName }),
        })
        .eq("id", existingContact.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("[BREVO WEBHOOK] Database update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update contact" },
          { status: 500 }
        );
      }

      contactId = updated.id;
      action = "updated";
      console.log(`[BREVO WEBHOOK] Contact updated: ${contactId}`);
    } else {
      // Crear contacto nuevo
      const { data: created, error: insertError } = await sb
        .from("contacts")
        .insert({
          email,
          name: firstName || null,
          ad_source: "diagnostico_digital",
          plan_recomendado: planRecomendado,
          puntuacion_global: puntuacionGlobal,
          notes: sector || ciudad
            ? `Sector: ${sector || "N/A"} | Ciudad: ${ciudad || "N/A"}`
            : null,
          bot_enabled: true,
          blocked: false,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[BREVO WEBHOOK] Database insert error:", insertError);
        return NextResponse.json(
          { error: "Failed to create contact" },
          { status: 500 }
        );
      }

      contactId = created.id;
      action = "created";
      console.log(`[BREVO WEBHOOK] Contact created: ${contactId}`);
    }

    // 4. Responder éxito
    return NextResponse.json(
      {
        success: true,
        contact_id: contactId,
        action,
        email: email.replace(/./g, (c, i) => (i < 3 ? c : "*")), // Enmascarar para logging
      },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : typeof err === "object" ? JSON.stringify(err) : String(err);
    console.error("[BREVO WEBHOOK] Unexpected error:", message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
