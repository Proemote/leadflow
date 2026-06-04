import { NextRequest, NextResponse } from "next/server";
import { generateLeoReply } from "@/lib/leo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * /test-chat: prueba a Leo sin enviar WhatsApp real.
 * Body: { messages: [{ role: "user"|"assistant", content }] }
 */
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "messages requerido" }, { status: 400 });
    }
    const reply = await generateLeoReply(messages);
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
