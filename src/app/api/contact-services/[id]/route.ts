import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db";
import { updateContactServiceStatus, deleteContactService } from "@/lib/contactServices";
import { ContactServiceStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: ContactServiceStatus[] = ["contratado", "completado", "cancelado"];

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) return String((err as Record<string, unknown>).message);
  return JSON.stringify(err);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const { id } = await ctx.params;
    const { status } = await req.json();
    if (!VALID.includes(status)) return NextResponse.json({ error: "Estado no válido." }, { status: 400 });
    await updateContactServiceStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/contact-services/[id]]", err);
    return NextResponse.json({ error: errMsg(err) || "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
    }
    const { id } = await ctx.params;
    await deleteContactService(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/contact-services/[id]]", err);
    return NextResponse.json({ error: errMsg(err) || "Error interno" }, { status: 500 });
  }
}
