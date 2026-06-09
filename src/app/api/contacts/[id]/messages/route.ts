import { NextRequest, NextResponse } from "next/server";
import { getRecentMessages } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const messages = await getRecentMessages(id, 50);
  return NextResponse.json(messages);
}
