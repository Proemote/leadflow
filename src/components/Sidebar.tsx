"use client";

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
  IconBolt,
} from "./icons";

const NAV = [
  { href: "/dashboard", label: "Panel", Icon: IconDashboard },
  { href: "/conversations", label: "Conversaciones", Icon: IconChat },
  { href: "/clientes", label: "Contactos", Icon: IconUsers },
  { href: "/oportunidades", label: "Oportunidades", Icon: IconKanban },
  { href: "/propuestas", label: "Propuestas", Icon: IconFile },
  { href: "/servicios", label: "Servicios", Icon: IconMenu },
  { href: "/reservas", label: "Agenda", Icon: IconCalendar },
  { href: "/settings", label: "Leo", Icon: IconSettings },
  { href: "/asistente", label: "Hablar con Leo", Icon: IconBolt },
  { href: "/test-chat", label: "Chat de prueba", Icon: IconFlask },
  { href: "/configuracion", label: "Ajustes", Icon: IconSliders },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col gap-2 px-4 py-6 border-r border-[var(--color-edge)] h-full overflow-y-auto">
      <Link href="/dashboard" className="flex items-center gap-3 px-2 pb-6">
        <Logo size={42} />
        <div className="leading-tight">
          <div className="font-bold text-lg tracking-tight gradient-text">
            LeadFlow AI
          </div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-violet-300/60">
            WhatsApp CRM
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1.5">
        {NAV.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className="nav-item" data-active={active}>
              <Icon className="opacity-90" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto panel-tight p-4 text-xs text-violet-200/70">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
          <span className="font-semibold text-violet-100">Leo activo</span>
        </div>
        Lead Engagement Optimizer · respondiendo en tiempo real por WhatsApp.
      </div>
    </aside>
  );
}
