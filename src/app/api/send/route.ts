import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { insertMessageForUser } from "@/lib/db";
import { sendWhatsAppText } from "@/lib/whatsapp";
import { withAuth } from "@/lib/api-auth";
import { Contact } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Envío manual de un operador desde el panel de conversación. */
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase no configurado" }, { status: 400 });
  }
  const { contactId, text } = await req.json();
  if (!contactId || !text?.trim()) {
    return NextResponse.json({ error: "contactId y text requeridos" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: contact } = await sb
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .eq("user_id", userId)
    .single();
  if (!contact) {
    return NextResponse.json({ error: "contacto no existe" }, { status: 404 });
  }
  const phone = (contact as Contact).phone;
  if (!phone) {
    return NextResponse.json({ error: "el contacto no tiene teléfono de WhatsApp" }, { status: 400 });
  }

  const wamid = await sendWhatsAppText(phone, text.trim());
  const msg = await insertMessageForUser(userId, {
    contact_id: contactId,
    role: "assistant",
    content: text.trim(),
    whatsapp_message_id: wamid,
    status: wamid ? "sent" : "failed",
  });

  return NextResponse.json({ ok: wamid !== null, message: msg, sent: wamid !== null });
});
