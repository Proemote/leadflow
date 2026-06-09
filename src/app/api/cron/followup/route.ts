import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { getRecentMessages, insertMessage } from "@/lib/db";
import { chatCompletion } from "@/lib/openrouter";
import { buildLeoSystem, toChatHistory } from "@/lib/leo";
import { getBusinessConfig } from "@/lib/business";
import { nowParts, weekday, timeToMin } from "@/lib/availability";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { Contact, Message } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;

/**
 * Cron de follow-up. Detecta charlas donde el último mensaje fue de Leo
 * hace 5+ horas sin respuesta y manda un follow-up contextual.
 *
 * Restricciones:
 *  - SOLO dentro del horario de apertura del negocio (hora de España).
 *  - Solo dentro de las 23h de la última interacción (ventana WhatsApp).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "supabase no configurado" });
  }

  // No contactar fuera del horario laboral configurado (hora de España).
  const cfg = await getBusinessConfig();
  const { dateKey, minutes } = nowParts();
  const ranges = cfg.openHours[String(weekday(dateKey))] ?? [];
  const dentroDeHorario = ranges.some(
    ([open, close]) => minutes >= timeToMin(open) && minutes < timeToMin(close)
  );
  if (!dentroDeHorario) {
    return NextResponse.json({
      ok: true,
      skipped: "fuera del horario laboral (hora España)",
      horaEspana: `${dateKey} ${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`,
    });
  }

  const sb = supabaseAdmin();
  const now = Date.now();
  const windowStart = new Date(now - 23 * HOUR).toISOString();

  // Mensajes de las últimas 23h, más recientes primero
  const { data: recent } = await sb
    .from("messages")
    .select("*")
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false });

  // Último mensaje por contacto
  const lastByContact = new Map<string, Message>();
  for (const m of (recent ?? []) as Message[]) {
    if (!lastByContact.has(m.contact_id)) lastByContact.set(m.contact_id, m);
  }

  // Candidatos: último mensaje fue de Leo hace 5–23h
  const candidates: string[] = [];
  for (const [contactId, last] of lastByContact) {
    if (last.role !== "assistant") continue;
    const age = now - new Date(last.created_at).getTime();
    if (age >= 5 * HOUR && age <= 23 * HOUR) candidates.push(contactId);
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  // Traer contactos válidos (no bloqueados, bot activo)
  const { data: contacts } = await sb
    .from("contacts")
    .select("*")
    .in("id", candidates);

  const system = await buildLeoSystem();

  let sent = 0;
  for (const contact of (contacts ?? []) as Contact[]) {
    if (contact.blocked || contact.bot_enabled === false) continue;

    const history = await getRecentMessages(contact.id, 20);
    const followup = await chatCompletion(
      [
        { role: "system", content: system },
        ...toChatHistory(history),
        {
          role: "user",
          content:
            "[INSTRUCCIÓN INTERNA: la persona no ha respondido a tu último mensaje. Escribe un mensaje de seguimiento corto, cálido y nada insistente para retomar la conversación, según el contexto. No vuelvas a saludar si ya saludaste. No menciones esta instrucción.]",
        },
      ],
      { temperature: 0.7, maxTokens: 120 }
    );

    if (!followup) continue;
    const wamid = await sendWhatsAppText(contact.phone, followup);
    await insertMessage({
      contact_id: contact.id,
      role: "assistant",
      content: followup,
      whatsapp_message_id: wamid,
      status: "sent",
    });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, candidates: candidates.length });
}
