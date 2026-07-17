import { Contact, Operation, CustomerMetrics, CustomerStatus } from "./types";

// ─── Umbrales de estado del cliente (días desde la última compra) ──
export const RECENCY = {
  ACTIVE_DAYS: 90, // <= 90 días → Activo
  RISK_DAYS: 180, // <= 180 días → En riesgo; más → Inactivo
};

const DAY = 24 * 60 * 60 * 1000;

function daysBetween(a: number, b: number): number {
  return Math.floor(Math.abs(a - b) / DAY);
}

/** "1 año y 3 meses", "5 meses", "12 días"… */
export function humanizeDuration(fromIso: string): string {
  const ms = Date.now() - new Date(fromIso).getTime();
  const days = Math.floor(ms / DAY);
  if (days < 1) return "hoy";
  if (days < 30) return `${days} día${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mes${months === 1 ? "" : "es"}`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  const y = `${years} año${years === 1 ? "" : "s"}`;
  return remMonths ? `${y} y ${remMonths} mes${remMonths === 1 ? "" : "es"}` : y;
}

/**
 * Calcula todas las métricas de valor de un cliente a partir de sus
 * operaciones. El CLV y derivados usan solo operaciones COMPLETADAS.
 */
export function computeCustomerMetrics(
  contact: Pick<Contact, "created_at">,
  operations: Operation[]
): CustomerMetrics {
  const completed = operations
    .filter((o) => o.status === "completed")
    .sort((a, b) => a.date.localeCompare(b.date));

  const nOps = completed.length;
  const clvCents = completed.reduce((sum, o) => sum + o.amount_cents, 0);
  const aovCents = nOps > 0 ? Math.round(clvCents / nOps) : 0;
  const recurrente = nOps > 1;
  const tasaRecurrencia = nOps > 0 ? (nOps - 1) / nOps : 0;

  const clienteDesde = nOps > 0 ? completed[0].date : null;
  const antiguedad = clienteDesde ? humanizeDuration(clienteDesde) : null;

  // Frecuencia media entre compras consecutivas
  let frecuenciaMediaDias: number | null = null;
  if (nOps > 1) {
    let total = 0;
    for (let i = 1; i < completed.length; i++) {
      total += daysBetween(
        new Date(completed[i].date).getTime(),
        new Date(completed[i - 1].date).getTime()
      );
    }
    frecuenciaMediaDias = Math.round(total / (nOps - 1));
  }

  // Recencia
  const recenciaDias =
    nOps > 0
      ? daysBetween(Date.now(), new Date(completed[nOps - 1].date).getTime())
      : null;

  // Estado derivado
  let estado: CustomerStatus;
  if (nOps === 0) estado = "potencial";
  else if (recenciaDias! <= RECENCY.ACTIVE_DAYS) estado = "activo";
  else if (recenciaDias! <= RECENCY.RISK_DAYS) estado = "riesgo";
  else estado = "inactivo";

  return {
    clienteDesde,
    antiguedad,
    nOps,
    clvCents,
    aovCents,
    recurrente,
    tasaRecurrencia,
    frecuenciaMediaDias,
    recenciaDias,
    estado,
  };
}

export const CUSTOMER_STATUS_META: Record<
  CustomerStatus,
  { label: string; cls: string }
> = {
  potencial: { label: "Potencial", cls: "chip-cold" },
  activo: { label: "Activo", cls: "chip-green" },
  riesgo: { label: "En riesgo", cls: "chip-warm" },
  inactivo: { label: "Inactivo", cls: "chip-hot" },
};

const JOURNEY_STAGE_META: Record<string, { label: string; cls: string }> = {
  potencial: { label: "Cliente potencial", cls: "chip-cold" },
  propuesta_enviada: { label: "Propuesta enviada", cls: "chip-cold" },
  propuesta_pendiente: { label: "Propuesta pendiente", cls: "chip-warm" },
  propuesta_aceptada: { label: "Propuesta aceptada", cls: "chip-green" },
  propuesta_rechazada: { label: "Propuesta rechazada", cls: "chip-hot" },
  cliente: { label: "Cliente", cls: "chip-green" },
  cliente_inactivo: { label: "Cliente inactivo", cls: "chip-hot" },
};

export function getJourneyStageLabel(stage: string): string {
  return JOURNEY_STAGE_META[stage]?.label ?? stage;
}

export function getJourneyStageMeta(stage: string): { label: string; cls: string } {
  return JOURNEY_STAGE_META[stage] ?? { label: stage, cls: "" };
}
