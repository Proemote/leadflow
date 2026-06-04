import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/**
 * Protege el panel. Solo se activa si Supabase + ALLOWED_EMAIL_DOMAIN
 * están configurados; si no, deja pasar (modo demo local).
 */
export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const domain = process.env.ALLOWED_EMAIL_DOMAIN;

  // Auth desactivada → modo demo, pasa todo
  if (!url || !anon || !domain) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        toSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        toSet.forEach(({ name, value, options }) =>
          res.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const allowed = user && email.endsWith(`@${domain}`);

  if (!allowed) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  // Protege todo menos login, callback, assets y el webhook/crons
  matcher: [
    "/((?!login|api/auth|api/webhook|api/cron|_next/static|_next/image|favicon.ico).*)",
  ],
};
