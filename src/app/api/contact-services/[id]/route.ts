import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateContactServiceStatusForUser, deleteContactServiceForUser } from "@/lib/contactServices";
import { ContactServiceStatus } from "@/lib/types";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: ContactServiceStatus[] = ["contratado", "completado", "cancelado"];

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as Record<string, unknown>).message);
  return JSON.stringify(err);
}

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const id = req.nextUrl.pathname.split("/").pop()!;
    const { status } = await req.json();
    if (!VALID.includes(status)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    await updateContactServiceStatusForUser(userId, id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/contact-services/[id]]", err);
    return NextResponse.json({ error: errMsg(err) || "Error interno" }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const id = req.nextUrl.pathname.split("/").pop()!;
    await deleteContactServiceForUser(userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/contact-services/[id]]", err);
    return NextResponse.json({ error: errMsg(err) || "Error interno" }, { status: 500 });
  }
});
