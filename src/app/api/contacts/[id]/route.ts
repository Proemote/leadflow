import { NextRequest, NextResponse } from "next/server";
import { setContactFlagForUser, isSupabaseConfigured } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Actualiza flags de un contacto: { blocked?, bot_enabled? } */
export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "supabase no configurado" }, { status: 400 });
  }
  const id = req.nextUrl.pathname.split("/").pop()!;
  const body = await req.json();
  const patch: { blocked?: boolean; bot_enabled?: boolean } = {};
  if (typeof body.blocked === "boolean") patch.blocked = body.blocked;
  if (typeof body.bot_enabled === "boolean") patch.bot_enabled = body.bot_enabled;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "nada para actualizar" }, { status: 400 });
  }

  await setContactFlagForUser(userId, id, patch);
  return NextResponse.json({ ok: true, patch });
});
