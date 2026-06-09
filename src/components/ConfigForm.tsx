"use client";

import { useState } from "react";
import { Profile, profileInitials } from "@/lib/profile";
import { ThemeToggle } from "@/components/ThemeToggle";
import { IconCheck } from "@/components/icons";

export function ConfigForm({ profile, demo }: { profile: Profile; demo: boolean }) {
  const [f, setF] = useState<Profile>(profile);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!f.name.trim()) return setError("El nombre es obligatorio.");
    setBusy(true); setError(null); setSaved(false);
    try {
      if (!demo) {
        const res = await fetch("/api/profile", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(f),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "Error");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {/* Apariencia */}
      <div className="panel p-6">
        <h2 className="font-semibold text-violet-50 mb-1">Apariencia</h2>
        <p className="text-sm text-violet-300/60 mb-4">Elige el tema de la interfaz. Se recuerda en este navegador.</p>
        <ThemeToggle />
      </div>

      {/* Perfil */}
      <div className="panel p-6 space-y-4">
        <h2 className="font-semibold text-violet-50">Perfil</h2>
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full grid place-items-center font-bold text-white text-lg shrink-0" style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}>
            {profileInitials(f.name || "?")}
          </div>
          <p className="text-sm text-violet-300/60">Tus datos aparecen en la barra superior y en las firmas del panel.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-violet-300/70 mb-1.5 block">Nombre</span>
            <input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </label>
          <label className="block">
            <span className="text-xs text-violet-300/70 mb-1.5 block">Cargo</span>
            <input className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
          </label>
        </div>
        <label className="block">
          <span className="text-xs text-violet-300/70 mb-1.5 block">Email</span>
          <input type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="tu@empresa.com" />
        </label>
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar perfil"}</button>
          {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-300"><IconCheck width={16} height={16} /> Guardado</span>}
          {error && <span className="text-sm text-rose-400">{error}</span>}
          {demo && <span className="text-xs text-amber-300/80">Modo demo: no se guarda.</span>}
        </div>
      </div>
    </div>
  );
}
