import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateBookingStatus, deleteBooking } from "@/lib/bookings";
import { BookingStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: BookingStatus[] = ["pending", "confirmed", "cancelled", "done"];

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const { id } = await ctx.params;
  const { status } = await req.json();
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
  }
  await updateBookingStatus(id, status);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const { id } = await ctx.params;
  await deleteBooking(id);
  return NextResponse.json({ ok: true });
}
