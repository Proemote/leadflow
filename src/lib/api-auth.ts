import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Obtiene el usuario autenticado y su ID desde la solicitud.
 * Lanza error si no está autenticado.
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Supabase no configurado");
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        toSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options as any)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    throw new Error("No autenticado");
  }

  return user.id;
}

/**
 * Wrapper para endpoints protegidos.
 * Obtiene userId automáticamente y lo pasa al handler.
 * 
 * Uso:
 * export const POST = withAuth(async (req, userId) => {...})
 */
export function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      const userId = await getUserIdFromRequest(req);
      return await handler(req, userId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      return NextResponse.json({ error: msg }, { status: 401 });
    }
  };
}
