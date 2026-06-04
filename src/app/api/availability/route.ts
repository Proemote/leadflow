import { NextRequest, NextResponse } from "next/server";
import { getAvailability } from "@/lib/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/availability?date=YYYY-MM-DD&duration=60 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  const duration = parseInt(req.nextUrl.searchParams.get("duration") ?? "30", 10);
  if (!date) {
    return NextResponse.json({ error: "date requerido" }, { status: 400 });
  }
  const result = await getAvailability(date, Math.max(5, duration || 30));
  return NextResponse.json(result);
}
