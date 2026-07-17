import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import * as db from "@/lib/opportunities";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const body = await req.json();
    const opportunity = await db.createOpportunityForUser(userId, {
      title: body.title,
      contact_id: body.contact_id || null,
      value_cents: body.value_cents || 0,
      probability: body.probability || 50,
      stage: body.stage || "Nuevo",
      expected_close: body.expected_close || null,
      owner: body.owner || null,
    });
    return NextResponse.json({ opportunity });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    if (!isSupabaseConfigured()) {
      const result = await db.getOpportunities();
      return NextResponse.json(result);
    }
    const result = await db.getOpportunitiesForUser(userId);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
