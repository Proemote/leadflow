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
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
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
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-violet-500/10 transition text-sm text-violet-200"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          {/* Separador */}
          <div className="h-px bg-[var(--color-edge-soft)]" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition text-sm text-red-300 disabled:opacity-50"
          >
            <span className="text-xs">→</span>
            {loading ? "Cerrando..." : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
