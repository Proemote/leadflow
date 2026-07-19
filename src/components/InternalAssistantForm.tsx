"use client";

import { useState } from "react";
import { IconCheck } from "@/components/icons";

const GUARANTEES = [
  "Solo habla contigo, nunca con tus leads",
  "Consulta el CRM en modo solo lectura",
  "No puede crear, editar ni borrar registros",
  "Nunca envía mensajes de WhatsApp reales",
  "Los borradores se quedan en el chat hasta que tú los copies y envíes",
  "No inventa datos: si no los tiene, lo dice",
];

/**
 * Editor de las instrucciones del asistente interno (Leo → Asistente
 * interno). Guarda en la clave internal_assistant_prompt, separada del
 * system_prompt de WhatsApp — no lo toca ni lo sobrescribe.
 */
export function InternalAssistantForm({
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
        body: JSON.stringify({ internal_prompt: prompt }),
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
        <h2 className="font-semibold text-violet-50 mb-1">Personalidad del asistente interno</h2>
        <p className="text-sm text-violet-300/60 mb-4">
          Cómo te habla Leo a ti en &quot;Hablar con Leo&quot;. Es independiente de las
          instrucciones del bot de WhatsApp.
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
        <h3 className="font-semibold text-violet-50 mb-3">Garantías del asistente</h3>
        <ul className="space-y-2.5">
          {GUARANTEES.map((r) => (
            <li key={r} className="flex gap-2.5 text-sm text-violet-200/80">
              <span className="mt-1.5 size-1.5 rounded-full bg-fuchsia-400 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-violet-300/50 mt-4 pt-4 border-t border-[var(--color-edge-soft)]">
          Estas garantías están fijadas en el código: el asistente interno no tiene ninguna
          herramienta capaz de escribir en la base de datos ni de enviar mensajes.
        </p>
      </div>
    </div>
  );
}
