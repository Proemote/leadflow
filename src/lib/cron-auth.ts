import { NextRequest } from "next/server";

/**
 * Verifica que el request venga de Vercel Cron o de un caller
 * autorizado. Vercel manda Authorization: Bearer $CRON_SECRET.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  // Permitir también ?secret= para pruebas manuales
  return req.nextUrl.searchParams.get("secret") === secret;
}
