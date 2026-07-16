import { NextRequest, NextResponse } from "next/server";
import { getConversationsForUser } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (_req: NextRequest, userId: string) => {
  const items = await getConversationsForUser(userId);
  return NextResponse.json(items);
});
