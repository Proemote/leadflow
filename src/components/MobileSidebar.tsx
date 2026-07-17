"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import {
  IconDashboard,
  IconChat,
  IconSettings,
  IconFlask,
  IconMenu,
  IconCalendar,
  IconUsers,
  IconKanban,
  IconSliders,
  IconFile,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "Panel", Icon: IconDashboard },
  { href: "/conversations", label: "Conversaciones", Icon: IconChat },
  { href: "/clientes", label: "Clientes", Icon: IconUsers },
  { href: "/oportunidades", label: "Oportunidades", Icon: IconKanban },
  { href: "/propuestas", label: "Propuestas", Icon: IconFile },
  { href: "/servicios", label: "Servicios", Icon: IconMenu },
  { href: "/reservas", label: "Agenda", Icon: IconCalendar },
  { href: "/settings", label: "Leo · Instrucciones", Icon: IconSettings },
  { href: "/test-chat", label: "Chat de prueba", Icon: IconFlask },
  { href: "/configuracion", label: "Ajustes", Icon: IconSliders },
];

/**
 * Renders inline: hamburger button (hidden on md+).
 * Also renders fixed: overlay + drawer (portal-like, out of normal flow).
 * Place this component anywhere in the Topbar.
 */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar al navegar
  useEffect(() => { setOpen(false); }, [pathname]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Botón hamburguesa (inline en topbar, solo móvil/tablet) ── */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden grid place-items-center size-10 rounded-xl border border-[var(--color-edge)] text-violet-200 hover:bg-violet-500/10 transition shrink-0"
        aria-label="Abrir menú"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="2" y1="4" x2="16" y2="4" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="14" x2="16" y2="14" />
        </svg>
      </button>

      {/* ── Overlay (fixed, cubre toda la pantalla) ── */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* ── Drawer (fixed, desliza desde la izquierda) ── */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[280px] z-50 flex flex-col gap-2 px-4 py-6 border-r border-[var(--color-edge)] overflow-y-auto md:hidden transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`}
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        {/* Logo + cerrar */}
        <div className="flex items-center justify-between px-2 pb-6">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo size={38} />
            <div className="leading-tight">
              <div className="font-bold text-lg tracking-tight gradient-text">LeadFlow AI</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-violet-300/60">WhatsApp CRM</div>
            </div>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="grid place-items-center size-8 rounded-lg text-violet-300/60 hover:text-violet-100 hover:bg-violet-500/10 transition"
            aria-label="Cerrar menú"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="14" y2="14" />
              <line x1="14" y1="2" x2="2" y2="14" />
            </svg>
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex flex-col gap-1.5">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href} className="nav-item" data-active={active}>
                <Icon className="opacity-90" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Estado Leo */}
        <div className="mt-auto panel-tight p-4 text-xs text-violet-200/70">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            <span className="font-semibold text-violet-100">Leo activo</span>
          </div>
          Lead Engagement Optimizer · respondiendo en tiempo real por WhatsApp.
        </div>
      </aside>
    </>
  );
}
