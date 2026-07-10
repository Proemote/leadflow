"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  IMPORT_FIELDS,
  ImportFieldKey,
  ImportRow,
  parseCsv,
  autoDetectMapping,
  buildRows,
} from "@/lib/import-parse";

type Step = "source" | "mapping" | "options" | "result";

interface BrevoListOption {
  id: number;
  name: string;
  totalSubscribers: number;
}

interface ImportApiResult {
  created: number;
  duplicates: number;
  brevo: { sent: number; processId: number | null; error: string | null } | null;
}

export function ImportContactsModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [step, setStep] = useState<Step>("source");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Datos crudos del archivo
  const [fileName, setFileName] = useState<string>("");
  const [grid, setGrid] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<(ImportFieldKey | null)[]>([]);
  const [hasHeader, setHasHeader] = useState(true);

  // Opciones de importación
  const [tags, setTags] = useState("importado");
  const [brevoLists, setBrevoLists] = useState<BrevoListOption[] | null>(null);
  const [brevoConfigured, setBrevoConfigured] = useState(false);
  const [brevoListId, setBrevoListId] = useState<number | "">("");
  const [sendToBrevo, setSendToBrevo] = useState(true);

  const [result, setResult] = useState<ImportApiResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Cargar listas de Brevo al abrir
  useEffect(() => {
    fetch("/api/brevo/lists")
      .then((r) => r.json())
      .then((j) => {
        setBrevoConfigured(Boolean(j.configured));
        setBrevoLists(j.lists ?? []);
        if (j.lists?.length === 1) setBrevoListId(j.lists[0].id);
      })
      .catch(() => setBrevoLists([]));
  }, []);

  const loadGrid = useCallback((rows: string[][], name: string) => {
    if (rows.length === 0) {
      setError("El archivo está vacío o no se pudo leer.");
      return;
    }
    setFileName(name);
    setGrid(rows);
    setMapping(autoDetectMapping(rows[0] ?? []));
    setHasHeader(true);
    setError(null);
    setStep("mapping");
  }, []);

  async function handleFile(file: File) {
    setError(null);
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".tsv")) {
        const text = await file.text();
        loadGrid(parseCsv(text), file.name);
      } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" }) as string[][];
        loadGrid(rows.map((r) => r.map((c) => String(c ?? ""))), file.name);
      } else {
        setError("Formato no soportado. Sube un archivo .csv, .xlsx o .xls.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error leyendo el archivo.");
    }
  }

  async function handleSheetUrl() {
    if (!sheetUrl.trim()) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/customers/import/sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error descargando la hoja.");
      loadGrid(parseCsv(j.csv), "Google Sheets");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const dataRows = useMemo(() => (hasHeader ? grid.slice(1) : grid), [grid, hasHeader]);

  const { rows: parsedRows, skipped } = useMemo(
    () => buildRows(dataRows, mapping),
    [dataRows, mapping]
  );

  const withEmail = useMemo(() => parsedRows.filter((r) => r.email).length, [parsedRows]);
  const mapped = mapping.some((m) => m !== null);

  async function runImport() {
    setBusy(true); setError(null);
    try {
      const body = {
        rows: parsedRows satisfies ImportRow[],
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        brevoListId: sendToBrevo && brevoConfigured && brevoListId !== "" ? Number(brevoListId) : null,
      };
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error en la importación.");
      setResult(j as ImportApiResult);
      setStep("result");
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(10,6,24,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="panel w-full max-w-3xl max-h-[88vh] overflow-y-auto p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera + pasos */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-violet-50">Importador masivo de contactos</h3>
            <p className="text-xs text-violet-300/60 mt-0.5">CSV · Excel · Google Sheets → fichas de contacto + lista de Brevo</p>
          </div>
          <button className="btn-ghost px-3 py-1.5 text-sm" onClick={onClose}>✕</button>
        </div>

        <StepIndicator step={step} />

        {error && <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}

        {/* ─── Paso 1: origen ─── */}
        {step === "source" && (
          <div className="space-y-4">
            <div
              className={`rounded-xl border-2 border-dashed p-10 text-center transition cursor-pointer ${dragOver ? "border-violet-400 bg-violet-500/10" : "border-[var(--color-edge)] hover:border-violet-500/50"}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
            >
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm font-medium text-violet-100">Arrastra tu archivo aquí o haz clic para elegirlo</p>
              <p className="text-xs text-violet-300/50 mt-1">CSV, Excel (.xlsx / .xls) — máx. 5.000 filas</p>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-violet-300/40">
              <div className="h-px flex-1 bg-[var(--color-edge-soft)]" /> o desde Google Sheets <div className="h-px flex-1 bg-[var(--color-edge-soft)]" />
            </div>

            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Pega la URL de tu hoja (compartida como «cualquiera con el enlace»)"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSheetUrl()}
              />
              <button className="btn-primary whitespace-nowrap" onClick={handleSheetUrl} disabled={busy || !sheetUrl.trim()}>
                {busy ? "Cargando…" : "Cargar hoja"}
              </button>
            </div>
          </div>
        )}

        {/* ─── Paso 2: mapeo de columnas ─── */}
        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-violet-200">
                <span className="font-medium">{fileName}</span>
                <span className="text-violet-300/50"> · {dataRows.length} filas</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-violet-300/70 cursor-pointer">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                La primera fila son encabezados
              </label>
            </div>

            <p className="text-xs text-violet-300/60">
              Asigna cada columna del archivo a un campo del CRM. Hemos detectado automáticamente las que coinciden — revisa y ajusta si hace falta.
            </p>

            <div className="overflow-x-auto rounded-xl border border-[var(--color-edge-soft)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--color-edge-soft)]">
                    {(grid[0] ?? []).map((h, i) => (
                      <th key={i} className="px-2 py-2 min-w-[150px] text-left">
                        <select
                          className="input py-1.5 text-xs w-full"
                          value={mapping[i] ?? ""}
                          onChange={(e) => {
                            const next = [...mapping];
                            next[i] = (e.target.value || null) as ImportFieldKey | null;
                            setMapping(next);
                          }}
                        >
                          <option value="">— Ignorar —</option>
                          {IMPORT_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>{f.label}</option>
                          ))}
                        </select>
                        {hasHeader && <div className="mt-1 px-1 text-[10px] text-violet-300/50 truncate font-normal">{h}</div>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.slice(0, 5).map((r, ri) => (
                    <tr key={ri} className="border-b border-[var(--color-edge-soft)] last:border-0">
                      {(grid[0] ?? []).map((_, ci) => (
                        <td key={ci} className="px-3 py-2 text-violet-200/80 truncate max-w-[200px]">{r[ci] ?? ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3">
              <button className="btn-ghost" onClick={() => { setGrid([]); setStep("source"); }}>← Atrás</button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-violet-300/60">
                  {parsedRows.length} contactos válidos{skipped > 0 ? ` · ${skipped} filas vacías` : ""}
                </span>
                <button className="btn-primary" disabled={!mapped || parsedRows.length === 0} onClick={() => setStep("options")}>
                  Continuar →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Paso 3: opciones + confirmación ─── */}
        {step === "options" && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-3">
              <Stat label="Contactos a crear" value={String(parsedRows.length)} />
              <Stat label="Con email" value={String(withEmail)} />
              <Stat label="Con teléfono" value={String(parsedRows.filter((r) => r.phone).length)} />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-violet-300/60">Etiquetas para los contactos</label>
              <input className="input mt-1.5" placeholder="importado, campaña-enero…" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>

            <div className="panel-tight p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-violet-100">Enviar emails a Brevo</div>
                  <div className="text-xs text-violet-300/60 mt-0.5">
                    {brevoConfigured
                      ? `${withEmail} contactos con email se añadirán a la lista elegida para email marketing.`
                      : "Añade BREVO_API_KEY en las variables de entorno para activar esta opción."}
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="scale-125"
                  disabled={!brevoConfigured || withEmail === 0}
                  checked={sendToBrevo && brevoConfigured && withEmail > 0}
                  onChange={(e) => setSendToBrevo(e.target.checked)}
                />
              </div>
              {brevoConfigured && sendToBrevo && withEmail > 0 && (
                <select className="input" value={brevoListId} onChange={(e) => setBrevoListId(e.target.value === "" ? "" : Number(e.target.value))}>
                  <option value="">— Elige una lista de Brevo —</option>
                  {(brevoLists ?? []).map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({l.totalSubscribers} suscriptores)</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button className="btn-ghost" onClick={() => setStep("mapping")}>← Atrás</button>
              <button
                className="btn-primary"
                disabled={busy || (sendToBrevo && brevoConfigured && withEmail > 0 && brevoListId === "")}
                onClick={runImport}
              >
                {busy ? "Importando…" : `Importar ${parsedRows.length} contactos`}
              </button>
            </div>
          </div>
        )}

        {/* ─── Paso 4: resultado ─── */}
        {step === "result" && result && (
          <div className="space-y-5">
            <div className="text-center py-4">
              <div className="text-4xl mb-2">✅</div>
              <h4 className="text-lg font-semibold text-violet-50">Importación completada</h4>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Stat label="Creados" value={String(result.created)} />
              <Stat label="Duplicados omitidos" value={String(result.duplicates)} />
              <Stat
                label="Enviados a Brevo"
                value={result.brevo ? String(result.brevo.sent) : "—"}
                sub={result.brevo?.error ?? (result.brevo?.processId ? `proceso #${result.brevo.processId}` : undefined)}
              />
            </div>
            {result.brevo?.error && (
              <p className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                Los contactos se crearon en el CRM, pero Brevo devolvió un error: {result.brevo.error}
              </p>
            )}
            <div className="flex justify-end">
              <button className="btn-primary" onClick={onClose}>Cerrar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "source", label: "1 · Archivo" },
    { key: "mapping", label: "2 · Columnas" },
    { key: "options", label: "3 · Opciones" },
    { key: "result", label: "4 · Resultado" },
  ];
  const idx = steps.findIndex((s) => s.key === step);
  return (
    <div className="flex gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className={`text-[11px] px-2.5 py-1 rounded-full border ${i <= idx ? "border-violet-500/50 bg-violet-500/15 text-violet-200" : "border-[var(--color-edge-soft)] text-violet-300/40"}`}>
          {s.label}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="panel-tight p-4">
      <div className="text-[11px] uppercase tracking-wider text-violet-300/60">{label}</div>
      <div className="text-2xl font-bold text-violet-50 mt-1">{value}</div>
      {sub && <div className="text-[11px] text-violet-300/50 mt-0.5 break-all">{sub}</div>}
    </div>
  );
}
