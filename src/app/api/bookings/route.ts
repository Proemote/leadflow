import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { createBooking } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const b = await req.json();
  if (!b.customer_name?.trim()) {
    return NextResponse.json({ error: "El nombre del cliente es obligatorio." }, { status: 400 });
  }
  try {
    const booking = await createBooking({
      service_id: b.service_id || null,
      customer_name: b.customer_name.trim(),
      customer_phone: b.customer_phone?.trim() || null,
      scheduled_at: b.scheduled_at || null,
      duration_min: b.duration_min ?? null,
      party_size: b.party_size ?? null,
      notes: b.notes?.trim() || null,
      contact_id: b.contact_id || null,
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
}
