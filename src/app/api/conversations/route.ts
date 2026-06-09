import { NextResponse } from "next/server";
import { getConversations } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getConversations();
  return NextResponse.json(items);
}
