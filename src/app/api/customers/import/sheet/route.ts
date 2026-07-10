import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Descarga una hoja de Google Sheets como CSV (evita CORS haciéndolo en servidor).
 * La hoja debe estar compartida como "Cualquiera con el enlace puede ver".
 */
export async function POST(req: NextRequest) {
  let url: string;
  try {
    const b = await req.json();
    url = String(b.url ?? "").trim();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) {
    return NextResponse.json(
      { error: "URL no reconocida. Pega el enlace de una hoja de Google Sheets." },
      { status: 400 }
    );
  }
  const sheetId = m[1];
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid = gidMatch ? gidMatch[1] : "0";

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  try {
    const res = await fetch(exportUrl, { redirect: "follow", cache: "no-store" });
    const contentType = res.headers.get("content-type") ?? "";
    if (!res.ok || contentType.includes("text/html")) {
      return NextResponse.json(
        { error: "No se pudo descargar la hoja. Comprueba que esté compartida como «Cualquiera con el enlace puede ver»." },
        { status: 400 }
      );
    }
    const csv = await res.text();
    return NextResponse.json({ csv });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/customers/import/sheet]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
