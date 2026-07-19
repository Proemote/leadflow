import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/api-auth";
import { getProfile } from "@/lib/profile";
import {
  markJornadaItemForUser,
  unmarkJornadaItemForUser,
} from "@/lib/jornada";
import { nowParts } from "@/lib/availability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Marca un ítem del checklist de jornada como completado (upsert). */
export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    let b: Record<string, unknown>;
    try {
      b = await req.json();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 400 }
      );
    }

    const itemKey = String(b.item_key || "").trim();
    const fecha = String(b.fecha || nowParts().dateKey);
    if (!itemKey) {
      return NextResponse.json({ error: "item_key es obligatorio" }, { status: 400 });
    }
    if (!FECHA_RE.test(fecha)) {
      return NextResponse.json({ error: "fecha inválida" }, { status: 400 });
    }

    const profile = await getProfile();
    await markJornadaItemForUser(userId, fecha, itemKey, profile.name);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[jornada POST] Error:", message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
});

/** Desmarca un ítem: borra la fila correspondiente. */
export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const url = new URL(req.url);
    const itemKey = url.searchParams.get("item_key");
    const fecha = url.searchParams.get("fecha") ?? nowParts().dateKey;

    if (!itemKey) {
      return NextResponse.json({ error: "item_key es obligatorio" }, { status: 400 });
    }
    if (!FECHA_RE.test(fecha)) {
      return NextResponse.json({ error: "fecha inválida" }, { status: 400 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 400 }
      );
    }

    await unmarkJornadaItemForUser(userId, fecha, itemKey);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[jornada DELETE] Error:", message);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
});
