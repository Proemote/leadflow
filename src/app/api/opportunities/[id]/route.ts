import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import * as db from "@/lib/opportunities";

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) throw new Error("ID requerido");
    
    const body = await req.json();
    const result = await db.updateOpportunityForUser(userId, id, body);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) throw new Error("ID requerido");
    
    await db.deleteOpportunityForUser(userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
