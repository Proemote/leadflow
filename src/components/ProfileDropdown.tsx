"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconSettings, IconFlask, IconSliders } from "./icons";

interface Props {
  name: string;
  role: string;
  initials: string;
}

const MENU = [
  { href: "/configuracion", label: "Mi perfil", Icon: IconSliders },
  { href: "/settings", label: "Leo · Instrucciones", Icon: IconSettings },
  { href: "/test-chat", label: "Chat de prueba", Icon: IconFlask },
];

export function ProfileDropdown({ name, role, initials }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setOpen(false);
    try {
      const { createBrowserClient } = await import("@supabase/ssr");
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await sb.auth.signOut();
    } catch {}
    router.push("/login");
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 hover:opacity-90 transition"
        aria-label="Menú de perfil"
      >
        <div className="text-right leading-tight hidden sm:block">
          <div className="text-sm font-semibold text-violet-50">{name}</div>
          <div className="text-[11px] text-violet-300/60">{role}</div>
        </div>
        <div
          className="size-10 rounded-full grid place-items-center font-bold text-sm text-white shrink-0"
          style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}
        >
          {initials}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] w-52 rounded-2xl border border-[var(--color-edge)] shadow-2xl z-50 overflow-hidden"
          style={{ background: "var(--panel-from)", backdropFilter: "blur(16px)" }}
        >
          {/* Cabecera */}
          <div className="px-4 py-3 border-b border-[var(--color-edge-soft)]">
            <div className="text-sm font-semibold text-violet-50">{name}</div>
            <div className="text-[11px] text-violet-300/60">{role}</div>
          </div>

          {/* Opciones */}
          <div className="py-1.5">
            {MENU.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-violet-100 hover:bg-violet-500/10 transition"
              >
                <Icon className="opacity-70 size-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Cerrar sesión */}
          <div className="border-t border-[var(--color-edge-soft)] py-1.5">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition"
            >
              <svg className="size-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
              </svg>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
