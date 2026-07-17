import { NextRequest, NextResponse } from "next/server";
import {
  getOrCreateContact,
  insertMessage,
  getRecentMessages,
  updateMessageStatusByWamid,
  countUserMessages,
  upsertLead,
  markLeadNotified,
  isSupabaseConfigured,
} from "@/lib/db";
import { generateLeoReply } from "@/lib/leo";
import { qualifyLead } from "@/lib/leads";
import { sendWhatsAppText, normalizePhone } from "@/lib/whatsapp";
import { sendHotLeadAlert } from "@/lib/email";
import { MessageStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── GET: verificación del webhook (Meta) ───────────────────────
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ─── POST: mensajes entrantes y estados de entrega ──────────────
export async function POST(req: NextRequest) {
  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Respondemos rápido a Meta y procesamos. Para volumen alto,
  // mover el procesado a una cola; aquí lo hacemos en línea.
  try {
    if (isSupabaseConfigured()) {
      await processPayload(payload);
    }
  } catch (err) {
    console.error("[webhook] error procesando:", err);
  }

  return NextResponse.json({ ok: true });
}

async function processPayload(payload: WebhookPayload) {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      // 1) Estados de entrega (sent → delivered → read)
      for (const status of value.statuses ?? []) {
        const map: Record<string, MessageStatus> = {
          sent: "sent",
          delivered: "delivered",
          read: "read",
          failed: "failed",
        };
        const mapped = map[status.status];
        if (mapped && status.id) {
          await updateMessageStatusByWamid(status.id, mapped);
        }
      }

      // 2) Mensajes entrantes
      for (const message of value.messages ?? []) {
        if (message.type !== "text" || !message.text?.body) continue;
        await handleIncomingMessage(message, value);
      }
    }
  }
}

async function handleIncomingMessage(
  message: WaMessage,
  value: WaValue
) {
  const phone = normalizePhone(message.from);
  const profileName = value.contacts?.[0]?.profile?.name ?? null;

  // Fuente del anuncio (Click-to-WhatsApp)
  const referral = message.referral;
  const adSource = referral
    ? [referral.source_type, referral.headline].filter(Boolean).join(" · ")
    : null;

  const contact = await getOrCreateContact(phone, {
    name: profileName ?? undefined,
    ad_source: adSource ?? undefined,
    ctwa_clid: referral?.ctwa_clid ?? undefined,
  });

  // Guardar mensaje del usuario
  await insertMessage({
    contact_id: contact.id,
    role: "user",
    content: message.text!.body,
    whatsapp_message_id: message.id,
    status: "read",
  });

  // Bloqueado o bot apagado → no respondemos automáticamente
  if (contact.blocked || contact.bot_enabled === false) return;

  // Historial (últimos 20) y respuesta de Leo (con contexto para reservar)
  const history = await getRecentMessages(contact.id, 20);
  const reply = await generateLeoReply(history, {
    contactId: contact.id,
    phone,
    name: contact.name,
    journeyStage: contact.journey_stage,
    notes: contact.notes,
  });

  // Enviar por WhatsApp y guardar con wamid (status real: failed si no salió)
  const wamid = await sendWhatsAppText(phone, reply);
  await insertMessage({
    contact_id: contact.id,
    role: "assistant",
    content: reply,
    whatsapp_message_id: wamid,
    status: wamid ? "sent" : "failed",
  });

  // Calificación en "background" (después de 3+ mensajes del usuario)
  const userMsgs = await countUserMessages(contact.id);
  if (userMsgs >= 3) {
    void qualifyAndNotify(contact.id, phone, contact.name, message.text!.body);
  }
}

async function qualifyAndNotify(
  contactId: string,
  phone: string,
  name: string | null,
  lastMessage: string
) {
  try {
    const history = await getRecentMessages(contactId, 20);
    const q = await qualifyLead(history);
    if (!q) return;
    const lead = await upsertLead(contactId, q.score, q.reason);

    if (q.score === "hot" && !lead.notified) {
      const sent = await sendHotLeadAlert({
        name,
        phone,
        reason: q.reason,
        lastMessage,
      });
      if (sent) await markLeadNotified(lead.id);
    }
  } catch (err) {
    console.error("[webhook] qualify error:", err);
  }
}

// ─── Tipos del payload de Meta (parcial) ────────────────────────
interface WebhookPayload {
  entry?: { changes?: { value?: WaValue }[] }[];
}
interface WaValue {
  messages?: WaMessage[];
  statuses?: { id?: string; status: string }[];
  contacts?: { profile?: { name?: string } }[];
}
interface WaMessage {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  referral?: {
    source_type?: string;
    headline?: string;
    ctwa_clid?: string;
  };
}
