import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { isBrevoConfigured, importContactsToBrevo } from "@/lib/brevo";
import type { ImportRow } from "@/lib/import-parse";
import { withAuth } from "@/lib/api-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_ROWS = 5000;
const INSERT_CHUNK = 500;

interface ImportRequestBody {
  rows: ImportRow[];
  tags?: string[];
  brevoListId?: number | null;
}

export interface ImportResult {
  created: number;
  duplicates: number;
  brevo: { sent: number; processId: number | null; error: string | null } | null;
}

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase no configurado (modo demo)." }, { status: 400 });
  }

  let body: ImportRequestBody;
  try {
    body = (await req.json()) as ImportRequestBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No hay filas que importar." }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `Máximo ${MAX_ROWS} filas por importación (recibidas ${rows.length}). Divide el archivo.` },
      { status: 400 }
    );
  }

  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const sb = supabaseAdmin();

  try {
    // 1. Deduplicación contra la BD: por email y por teléfono
    const emails = [...new Set(rows.map((r) => r.email?.toLowerCase()).filter(Boolean))] as string[];
    const phones = [...new Set(rows.map((r) => r.phone).filter(Boolean))] as string[];

    const existingEmails = new Set<string>();
    const existingPhones = new Set<string>();

    for (let i = 0; i < emails.length; i += INSERT_CHUNK) {
      const { data } = await sb
        .from("contacts")
        .select("email")
        .eq("user_id", userId)
        .in("email", emails.slice(i, i + INSERT_CHUNK));
      for (const c of data ?? []) if (c.email) existingEmails.add(String(c.email).toLowerCase());
    }
    for (let i = 0; i < phones.length; i += INSERT_CHUNK) {
      const { data } = await sb
        .from("contacts")
        .select("phone")
        .eq("user_id", userId)
        .in("phone", phones.slice(i, i + INSERT_CHUNK));
      for (const c of data ?? []) if (c.phone) existingPhones.add(String(c.phone));
    }

    // Deduplicación también dentro del propio archivo
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const toInsert: ImportRow[] = [];
    let duplicates = 0;

    for (const r of rows) {
      const em = r.email?.toLowerCase() ?? null;
      const ph = r.phone ?? null;
      const dupDb = (em && existingEmails.has(em)) || (ph && existingPhones.has(ph));
      const dupFile = (em && seenEmails.has(em)) || (ph && seenPhones.has(ph));
      if (dupDb || dupFile) { duplicates++; continue; }
      if (em) seenEmails.add(em);
      if (ph) seenPhones.add(ph);
      toInsert.push(r);
    }

    // 2. Inserción en bloque
    let created = 0;
    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK).map((r) => ({
        name: r.name || null,
        phone: r.phone || null,
        email: r.email?.toLowerCase() || null,
        company: r.company || null,
        location: r.location || null,
        google_maps_url: r.google_maps_url || null,
        website: r.website || null,
        social_links: r.social_links ?? [],
        notes: r.notes || null,
        tags,
        ad_source: "importacion_masiva",
        user_id: userId,
      }));
      const { data, error } = await sb.from("contacts").insert(chunk).select("id");
      if (error) throw error;
      created += data?.length ?? 0;
    }

    // 3. Envío a Brevo (todos los emails del archivo, incluidos duplicados en CRM:
    //    el objetivo es que la lista de email marketing quede completa)
    let brevo: ImportResult["brevo"] = null;
    if (body.brevoListId != null) {
      if (!isBrevoConfigured()) {
        brevo = { sent: 0, processId: null, error: "BREVO_API_KEY no configurada en el servidor." };
      } else {
        const brevoContacts = rows
          .filter((r) => Boolean(r.email))
          .map((r) => ({
            email: r.email as string,
            attributes: {
              NOMBRE: r.name ?? "",
              ...(r.company ? { EMPRESA: r.company } : {}),
              ...(r.location ? { CIUDAD: r.location } : {}),
              ...(r.phone ? { SMS: r.phone } : {}),
              ...(r.website ? { WEB: r.website } : {}),
            },
          }));
        // Deduplicar emails dentro del envío (Brevo rechaza duplicados en el mismo lote)
        const uniq = new Map<string, (typeof brevoContacts)[number]>();
        for (const c of brevoContacts) if (!uniq.has(c.email)) uniq.set(c.email, c);
        const finalContacts = [...uniq.values()];

        if (finalContacts.length === 0) {
          brevo = { sent: 0, processId: null, error: "Ninguna fila tiene email válido." };
        } else {
          try {
            const { processId } = await importContactsToBrevo(finalContacts, Number(body.brevoListId));
            brevo = { sent: finalContacts.length, processId, error: null };
          } catch (e) {
            brevo = { sent: 0, processId: null, error: e instanceof Error ? e.message : String(e) };
          }
        }
      }
    }

    const result: ImportResult = { created, duplicates, brevo };
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/customers/import]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
});
