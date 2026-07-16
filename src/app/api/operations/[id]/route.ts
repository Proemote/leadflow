import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateOperationForUser, deleteOperationForUser } from "@/lib/customers";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const id = req.nextUrl.pathname.split("/").pop()!;
    const b = await req.json();
    const patch: Record<string, unknown> = {};
    for (const k of ["concept", "amount_cents", "status"]) {
      if (k in b) patch[k] = b[k];
    }
    const operation = await updateOperationForUser(userId, id, patch);
    return NextResponse.json({ operation });
  } catch (err) {
    console.error("[PATCH /api/operations/[id]]", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const id = req.nextUrl.pathname.split("/").pop()!;
    await deleteOperationForUser(userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/operations/[id]]", err);
    const message = err instanceof Error ? err.message : "Error interno del servidor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
