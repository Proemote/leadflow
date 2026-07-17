import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { uploadProposalFile, getProposalFilesForOpportunity } from "@/lib/proposalFiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function opportunityIdFrom(req: NextRequest): string {
  return req.nextUrl.pathname.split("/").at(-2)!;
}

export const GET = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const opportunityId = opportunityIdFrom(req);
    const files = await getProposalFilesForOpportunity(userId, opportunityId);
    return NextResponse.json({ files });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});

export const POST = withAuth(async (req: NextRequest, userId: string) => {
  try {
    const opportunityId = opportunityIdFrom(req);

    const sb = supabaseAdmin();
    const { data: opp } = await sb
      .from("opportunities")
      .select("id, contact_id")
      .eq("id", opportunityId)
      .eq("user_id", userId)
      .single();
    if (!opp) return NextResponse.json({ error: "Oportunidad no encontrada" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const created = await uploadProposalFile(userId, opportunityId, opp.contact_id, {
      name: file.name,
      type: file.type,
      buffer,
    });

    const { data: withUrl } = await sb.storage
      .from("proposals")
      .createSignedUrl(created.storage_path, 60 * 10);

    return NextResponse.json({ file: { ...created, url: withUrl?.signedUrl } }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
});
