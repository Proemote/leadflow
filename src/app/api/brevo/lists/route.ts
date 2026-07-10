import { NextResponse } from "next/server";
import { isBrevoConfigured, getBrevoLists } from "@/lib/brevo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isBrevoConfigured()) {
    return NextResponse.json({ configured: false, lists: [] });
  }
  try {
    const lists = await getBrevoLists();
    return NextResponse.json({ configured: true, lists });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/brevo/lists]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
