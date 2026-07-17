"use client";

import { useState } from "react";
import Link from "next/link";
import { Opportunity } from "@/lib/types";
import { formatPrice } from "@/lib/money";
import { IconFile, IconTrash } from "@/components/icons";

interface ProposalFileLite {
  id: string;
  file_name: string;
  size_bytes: number | null;
  created_at: string;
  url?: string;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PropuestasList({
  opportunities,
  filesByOpportunity,
  demo,
}: {
  opportunities: Opportunity[];
  filesByOpportunity: Record<string, ProposalFileLite[]>;
  demo: boolean;
}) {
  const [files, setFiles] = useState(filesByOpportunity);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(opportunityId: string, file: File) {
    setError(null);
    if (demo) {
      setError("Modo demo: los archivos no se guardan.");
      return;
    }
    setUploadingId(opportunityId);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/opportunities/${opportunityId}/files`, { method: "POST", body: form });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error al subir el archivo");
      setFiles((prev) => ({ ...prev, [opportunityId]: [j.file, ...(prev[opportunityId] ?? [])] }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setUploadingId(null);
    }
  }

  async function removeFile(opportunityId: string, fileId: string) {
    if (!confirm("¿Eliminar este archivo?")) return;
    if (!demo) await fetch(`/api/opportunities/${opportunityId}/files/${fileId}`, { method: "DELETE" });
    setFiles((prev) => ({ ...prev, [opportunityId]: (prev[opportunityId] ?? []).filter((f) => f.id !== fileId) }));
  }

  if (opportunities.length === 0) {
    return (
      <div className="panel p-8 text-center text-sm text-violet-300/50">
        Sin propuestas en curso. Crea una desde la ficha de un contacto con &quot;+ Nueva propuesta&quot;.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <div className="panel divide-y divide-[var(--color-edge-soft)] overflow-hidden">
        {opportunities.map((o) => {
          const opFiles = files[o.id] ?? [];
          return (
            <div key={o.id} className="p-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-violet-50 truncate">{o.title}</div>
                  <div className="text-[11px] text-violet-300/60">
                    {o.contact_id ? (
                      <Link href={`/clientes/${o.contact_id}`} className="hover:text-violet-200 underline decoration-dotted">
                        {o.contact_name ?? "Ver contacto"}
                      </Link>
                    ) : (
                      "Sin contacto"
                    )}
                    {o.expected_close ? ` · cierre estimado ${o.expected_close}` : ""}
                  </div>
                </div>
                <span className="text-sm font-semibold text-violet-100 shrink-0">{formatPrice(o.value_cents)}</span>
              </div>

              <div className="mt-3 space-y-1.5">
                {opFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 text-sm panel-tight px-3 py-2">
                    <IconFile width={14} height={14} className="text-violet-300/60 shrink-0" />
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noreferrer" className="text-violet-100 hover:text-white truncate flex-1 min-w-0">
                        {f.file_name}
                      </a>
                    ) : (
                      <span className="text-violet-100 truncate flex-1 min-w-0">{f.file_name}</span>
                    )}
                    <span className="text-[11px] text-violet-300/50 shrink-0">{formatSize(f.size_bytes)}</span>
                    <button
                      className="text-violet-300/40 hover:text-rose-400 transition shrink-0"
                      onClick={() => removeFile(o.id, f.id)}
                      title="Eliminar archivo"
                    >
                      <IconTrash width={13} height={13} />
                    </button>
                  </div>
                ))}
                {opFiles.length === 0 && (
                  <p className="text-xs text-violet-300/40">Sin documentos adjuntos.</p>
                )}
              </div>

              <label className="inline-flex items-center gap-2 mt-3 text-xs text-violet-300 hover:text-white cursor-pointer transition">
                <input
                  type="file"
                  accept=".pdf,.md,.markdown,.txt"
                  className="hidden"
                  disabled={uploadingId === o.id}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadFile(o.id, f);
                    e.target.value = "";
                  }}
                />
                📎 {uploadingId === o.id ? "Subiendo…" : "Adjuntar documento"}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
