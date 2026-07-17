import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import * as db from "@/lib/customers";

export const PATCH = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) throw new Error("ID requerido");
    
    const body = await req.json();
    const contact = await db.updateContactForUser(userId, id, body);
    return NextResponse.json({ contact });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const id = req.nextUrl.pathname.split("/").pop();
    if (!id) throw new Error("ID requerido");
    
    const sb = (await import("@/lib/supabase/admin")).supabaseAdmin();
    await sb.from("contacts").delete().eq("id", id).eq("user_id", userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
