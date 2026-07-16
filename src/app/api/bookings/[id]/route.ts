import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateBookingStatusForUser, deleteBookingForUser } from "@/lib/bookings";
import { BookingStatus } from "@/lib/types";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: BookingStatus[] = ["pending", "confirmed", "cancelled", "done"];

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const id = req.nextUrl.pathname.split("/").pop()!;
  const { status } = await req.json();
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
  }
  await updateBookingStatusForUser(userId, id, status);
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }
  const id = req.nextUrl.pathname.split("/").pop()!;
  await deleteBookingForUser(userId, id);
  return NextResponse.json({ ok: true });
});
