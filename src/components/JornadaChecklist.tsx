"use client";

import { useState } from "react";
import Link from "next/link";
import { IconCheck } from "@/components/icons";

export interface JornadaItem {
  /** Clave persistida en jornada_completados, ej. 'cita:{id}' */
  itemKey: string;
  title: string;
  subtitle?: string;
  href: string;
  hrefLabel: string;
}

export interface JornadaGroup {
  emoji: string;
  title: string;
  emptyLabel: string;
  items: JornadaItem[];
}

export function JornadaChecklist({
  groups,
  fecha,
  initialCompleted,
  demo,
}: {
  groups: JornadaGroup[];
  fecha: string;
  initialCompleted: string[];
  demo: boolean;
}) {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    if (demo && typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`jornada:${fecha}`);
        if (raw) return new Set(JSON.parse(raw) as string[]);
      } catch {}
    }
    return new Set(initialCompleted);
  });
  const [error, setError] = useState<string | null>(null);

  const totalItems = groups.reduce((a, g) => a + g.items.length, 0);
  const doneItems = groups.reduce(
    (a, g) => a + g.items.filter((i) => completed.has(i.itemKey)).length,
    0
  );

  async function toggle(itemKey: string) {
    const wasDone = completed.has(itemKey);
    // Optimista: actualiza la UI y revierte si la petición falla
    setCompleted((prev) => {
      const next = new Set(prev);
      if (wasDone) next.delete(itemKey);
      else next.add(itemKey);
      if (demo) {
        try {
          localStorage.setItem(`jornada:${fecha}`, JSON.stringify([...next]));
        } catch {}
      }
      return next;
    });
    setError(null);
    if (demo) return;

    try {
      const res = wasDone
        ? await fetch(
            `/api/jornada?item_key=${encodeURIComponent(itemKey)}&fecha=${fecha}`,
            { method: "DELETE" }
          )
        : await fetch("/api/jornada", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ item_key: itemKey, fecha }),
          });
      if (!res.ok) throw new Error();
    } catch {
      setCompleted((prev) => {
        const next = new Set(prev);
        if (wasDone) next.add(itemKey);
        else next.delete(itemKey);
        return next;
      });
      setError("No se pudo guardar el cambio. Inténtalo de nuevo.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 rounded-full bg-violet-500/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: totalItems > 0 ? `${(doneItems / totalItems) * 100}%` : "0%",
              background: "linear-gradient(90deg,#c084fc,#7c3aed)",
            }}
          />
        </div>
        <span className="text-xs text-violet-300/70 whitespace-nowrap">
          {doneItems} / {totalItems} completadas
        </span>
      </div>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {groups.map((g) => (
        <div key={g.title} className="panel p-5">
          <h2 className="text-base font-semibold text-violet-50 mb-3">
            {g.emoji} {g.title}
            {g.items.length > 0 && (
              <span className="ml-2 text-xs font-normal text-violet-300/60">
                {g.items.filter((i) => completed.has(i.itemKey)).length}/{g.items.length}
              </span>
            )}
          </h2>
          {g.items.length === 0 ? (
            <p className="text-sm text-violet-300/50">{g.emptyLabel}</p>
          ) : (
            <div className="space-y-2">
              {g.items.map((item) => {
                const done = completed.has(item.itemKey);
                return (
                  <div
                    key={item.itemKey}
                    className={`flex items-center gap-3 panel-tight px-3 py-2.5 transition ${
                      done ? "opacity-55" : ""
                    }`}
                  >
                    <button
                      onClick={() => toggle(item.itemKey)}
                      aria-label={done ? "Desmarcar" : "Marcar como completado"}
                      className={`size-6 shrink-0 rounded-lg border grid place-items-center transition ${
                        done
                          ? "border-transparent text-white"
                          : "border-[var(--color-edge)] text-transparent hover:border-violet-400/60"
                      }`}
                      style={
                        done
                          ? { background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }
                          : undefined
                      }
                    >
                      <IconCheck width={14} height={14} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-sm font-medium text-violet-50 truncate ${
                          done ? "line-through" : ""
                        }`}
                      >
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] text-violet-300/60 truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                    <Link
                      href={item.href}
                      className="text-xs text-violet-300 hover:text-white whitespace-nowrap shrink-0"
                    >
                      {item.hrefLabel} →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
