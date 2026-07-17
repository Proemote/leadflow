import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { deleteProposalFile } from "@/lib/proposalFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const fileId = req.nextUrl.pathname.split("/").pop()!;
    await deleteProposalFile(userId, fileId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
