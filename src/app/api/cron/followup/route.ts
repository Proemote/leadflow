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

  // ── Barrera 1: UTC hardcoded (cinturón y tirantes) ──────────────
  // España CEST (verano) = UTC+2 | CET (invierno) = UTC+1.
  // Para que nunca enviemos de noche, bloqueamos de 18:00 a 07:00 UTC
  // (= 20h–09h en verano / 19h–08h en invierno). Solo los crons de
  // 9, 13 y 17 UTC pasan este filtro en cualquier época del año.
  const utcHour = new Date().getUTCHours();
  if (utcHour < 7 || utcHour >= 18) {
    return NextResponse.json({ ok: true, skipped: "fuera de ventana UTC segura (07–18 UTC)" });
  }

  // ── Barrera 2: horario laboral configurado (hora de España) ──────
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

  // Contar follow-ups consecutivos de Leo sin respuesta del usuario
  // (mensajes de asistente DESPUÉS del último mensaje del usuario)
  const followupCountByContact = new Map<string, number>();
  const allByContact = new Map<string, Message[]>();
  for (const m of (recent ?? []) as Message[]) {
    const arr = allByContact.get(m.contact_id) ?? [];
    arr.push(m);
    allByContact.set(m.contact_id, arr);
  }
  for (const [contactId, msgs] of allByContact) {
    // Mensajes ordenados desc (ya vienen así). Contamos cuántos assistant
    // consecutivos hay antes de encontrar un user.
    let count = 0;
    for (const m of msgs) {
      if (m.role === "assistant") count++;
      else break; // primer mensaje del usuario → paramos
    }
    followupCountByContact.set(contactId, count);
  }

  // MAX 2 follow-ups sin respuesta del usuario
  const MAX_FOLLOWUPS = 2;

  // Candidatos: último mensaje fue de Leo hace 5–23h
  const candidates: string[] = [];
  for (const [contactId, last] of lastByContact) {
    if (last.role !== "assistant") continue;
    const age = now - new Date(last.created_at).getTime();
    if (age < 5 * HOUR || age > 23 * HOUR) continue;
    const count = followupCountByContact.get(contactId) ?? 0;
    if (count >= MAX_FOLLOWUPS) continue; // ya dimos suficientes toques
    candidates.push(contactId);
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
    if (contact.blocked || contact.bot_enabled === false || !contact.phone) continue;

    const history = await getRecentMessages(contact.id, 20);
    const followup = await chatCompletion(
      [
        { role: "system", content: system },
        ...toChatHistory(history),
        {
          role: "user",
          content:
            "[INSTRUCCIÓN INTERNA — NO incluir en el mensaje: la persona no ha respondido. Escribe SOLO el mensaje directo que le enviarías, sin notas, sin explicaciones de tono, sin meta-comentarios. Corto (≤20 palabras), cálido, sin insistir. No repitas el saludo si ya saludaste antes. Usa un emoji DIFERENTE al que usaste en el mensaje anterior, o ninguno.]",
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
