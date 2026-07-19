"use client";

import { useState, ReactNode } from "react";

/**
 * Navegación por pestañas de la sección Leo:
 * Instrucciones (editor de personalidad cara a WhatsApp) · Rendimiento
 * (métricas del agente) · Asistente interno (personalidad de "Hablar con Leo").
 * Los paneles llegan ya renderizados desde el servidor como ReactNode.
 */
export function LeoTabs({
  instrucciones,
  rendimiento,
  asistente,
}: {
  instrucciones: ReactNode;
  rendimiento: ReactNode;
  asistente: ReactNode;
}) {
  const [tab, setTab] = useState<"instrucciones" | "rendimiento" | "asistente">("instrucciones");

  return (
    <div className="space-y-6">
      <div className="flex rounded-xl border border-[var(--color-edge-soft)] overflow-hidden w-fit">
        {(
          [
            ["instrucciones", "Instrucciones"],
            ["rendimiento", "Rendimiento"],
            ["asistente", "Asistente interno"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2 text-sm transition"
            style={
              tab === key
                ? {
                    background:
                      "linear-gradient(180deg,rgba(124,58,237,0.5),rgba(109,40,217,0.3))",
                    color: "#fff",
                  }
                : { color: "#b3aac6" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div hidden={tab !== "instrucciones"}>{instrucciones}</div>
      <div hidden={tab !== "rendimiento"}>{rendimiento}</div>
      <div hidden={tab !== "asistente"}>{asistente}</div>
    </div>
  );
}
