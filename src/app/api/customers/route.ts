import { NextRequest, NextResponse } from "next/server";
import { withAuth, getUserIdFromRequest } from "@/lib/api-auth";
import * as db from "@/lib/customers";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const contact = await db.createContactForUser(userId, body);
    return NextResponse.json({ contact });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    if (!isSupabaseConfigured()) {
      const result = await db.getCustomers();
      return NextResponse.json(result);
    }
    const result = await db.getCustomersForUser(userId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
