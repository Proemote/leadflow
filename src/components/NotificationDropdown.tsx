"use client";

import { useState, useRef, useEffect } from "react";
import { IconBell } from "./icons";

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid place-items-center size-10 rounded-xl border border-[var(--color-edge)] text-violet-200 hover:bg-violet-500/10 transition"
        aria-label="Notificaciones"
      >
        <IconBell />
        <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-fuchsia-400 shadow-[0_0_8px_2px_rgba(192,132,252,0.7)]" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] w-72 rounded-2xl border border-[var(--color-edge)] shadow-2xl z-50 overflow-hidden"
          style={{ background: "var(--panel-from)", backdropFilter: "blur(16px)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-edge-soft)]">
            <span className="text-sm font-semibold text-violet-50">Notificaciones</span>
            <span className="chip chip-hot text-[10px]">1 nueva</span>
          </div>

          <div className="py-2">
            <div className="flex items-start gap-3 px-4 py-3 hover:bg-violet-500/8 transition cursor-pointer">
              <span className="mt-0.5 size-2 rounded-full bg-fuchsia-400 shrink-0" />
              <div>
                <div className="text-sm text-violet-100 font-medium">Lead caliente detectado</div>
                <div className="text-xs text-violet-300/60 mt-0.5">Leo ha clasificado un nuevo contacto como Caliente. Revísalo en Conversaciones.</div>
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--color-edge-soft)] px-4 py-2.5">
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-violet-400 hover:text-violet-200 transition"
            >
              Marcar todo como leído
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
