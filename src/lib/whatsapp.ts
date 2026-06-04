/**
 * Envía un mensaje de texto por WhatsApp Cloud API.
 * Devuelve el wamid (whatsapp_message_id) del mensaje saliente.
 */
export async function sendWhatsAppText(
  to: string,
  body: string
): Promise<string | null> {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) {
    console.warn("[whatsapp] Falta config WHATSAPP_* — no se envía nada");
    return null;
  }

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body },
      }),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[whatsapp] Error ${res.status}: ${txt}`);
    return null;
  }

  const json = await res.json();
  return json.messages?.[0]?.id ?? null;
}

/** Normaliza un número entrante de WhatsApp a formato +E.164 */
export function normalizePhone(wa: string): string {
  return wa.startsWith("+") ? wa : `+${wa}`;
}
