import { NextRequest, NextResponse } from "next/server";
import { getRecentMessagesForUser } from "@/lib/db";
import { withAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  const id = req.nextUrl.pathname.split("/").at(-2)!;
  const messages = await getRecentMessagesForUser(userId, id, 50);
  return NextResponse.json(messages);
});
