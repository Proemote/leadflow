import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { createBookingForUser } from "@/lib/bookings";
import { createContactForUser } from "@/lib/customers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const b = await req.json();
  if (!b.customer_name?.trim()) {
    return NextResponse.json({ error: "El nombre del cliente es obligatorio." }, { status: 400 });
  }
  try {
    // Buscar o crear contacto automáticamente
    let contactId: string | null = b.contact_id || null;
    if (!contactId) {
      const phone = b.customer_phone?.trim() || null;
      if (phone) {
        // Buscar por teléfono primero (dentro de los contactos del usuario)
        const sb = supabaseAdmin();
        const { data: existing } = await sb
          .from("contacts")
          .select("id")
          .eq("phone", phone)
          .eq("user_id", userId)
          .maybeSingle();
        contactId = existing?.id ?? null;
      }
      if (!contactId) {
        const contact = await createContactForUser(userId, {
          name: b.customer_name.trim(),
          phone: b.customer_phone?.trim() || null,
          ad_source: "Agenda",
        });
        contactId = contact.id;
      }
    }

    const booking = await createBookingForUser(userId, {
      service_id: b.service_id || null,
      customer_name: b.customer_name.trim(),
      customer_phone: b.customer_phone?.trim() || null,
      scheduled_at: b.scheduled_at || null,
      duration_min: b.duration_min ?? null,
      party_size: b.party_size ?? null,
      notes: b.notes?.trim() || null,
      contact_id: contactId,
    });
    return NextResponse.json({ booking });
  } catch (err) {
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "Esa franja ya está ocupada. Elige otra hora." },
        { status: 409 }
      );
    }
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
