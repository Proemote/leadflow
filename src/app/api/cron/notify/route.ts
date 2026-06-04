import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { sendDailyDigest } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cron diario (21:00 UTC): envía un digest con todos los leads
 * calificados en las últimas 24 horas.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, reason: "supabase no configurado" });
  }

  const sb = supabaseAdmin();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: leads } = await sb
    .from("leads")
    .select("score, reason, contact:contacts(name, phone)")
    .gte("qualified_at", since)
    .order("qualified_at", { ascending: false });

  const rows = (leads ?? []).map((l) => {
    const contact = Array.isArray(l.contact) ? l.contact[0] : l.contact;
    return {
      name: contact?.name ?? null,
      phone: contact?.phone ?? "—",
      score: l.score as string,
      reason: l.reason as string,
    };
  });

  const ok = await sendDailyDigest(rows);
  return NextResponse.json({ ok, count: rows.length });
}
