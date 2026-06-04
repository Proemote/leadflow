"use client";

import { useState } from "react";
import { IconCheck } from "@/components/icons";

const RULES = [
  "Responde siempre en español de España (tuteo)",
  "Primera respuesta: pregunta qué quiere lograr, no enumera servicios",
  "Mensajes cortos (<30 palabras), máx. 2 emojis, sin markdown",
  "Nunca inventa precios ni datos falsos",
  "Si hay molestia → deriva a una persona del equipo",
  "Solo envía Calendly cuando hay interés real",
  "Nunca pide el email",
];

export function SettingsForm({
  initialPrompt,
  demo,
}: {
  initialPrompt: string;
  demo: boolean;
}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ system_prompt: prompt }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "No se pudo guardar");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <div className="panel p-6">
        <h2 className="font-semibold text-violet-50 mb-1">Personalidad de Leo</h2>
        <p className="text-sm text-violet-300/60 mb-4">
          Edita las instrucciones base. Las reglas irrompibles se aplican siempre por encima de esto.
        </p>
        <textarea
          className="input min-h-[280px] font-mono text-sm leading-relaxed resize-y"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex items-center gap-3 mt-4">
          <button className="btn-primary flex items-center gap-2" onClick={save} disabled={saving}>
            {saving ? "Guardando…" : "Guardar instrucciones"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-300">
              <IconCheck width={16} height={16} /> Guardado
            </span>
          )}
          {error && <span className="text-sm text-rose-400">{error}</span>}
          {demo && (
            <span className="text-xs text-amber-300/80">
              Modo demo: para guardar necesitas Supabase configurado.
            </span>
          )}
        </div>
      </div>

      <div className="panel p-6">
        <h3 className="font-semibold text-violet-50 mb-3">Reglas irrompibles</h3>
        <ul className="space-y-2.5">
          {RULES.map((r) => (
            <li key={r} className="flex gap-2.5 text-sm text-violet-200/80">
              <span className="mt-1.5 size-1.5 rounded-full bg-fuchsia-400 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-violet-300/50 mt-4 pt-4 border-t border-[var(--color-edge-soft)]">
          Estas reglas están fijadas en el código del agente y no se pueden desactivar desde el panel.
        </p>
      </div>
    </div>
  );
}
