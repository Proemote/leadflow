/** Etiqueta en castellano para el score del lead (el valor interno sigue siendo hot/warm/cold). */
export function scoreLabel(score: string): string {
  const map: Record<string, string> = {
    hot: "Caliente",
    warm: "Templado",
    cold: "Frío",
  };
  return map[score] ?? score;
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** Formatea un scheduled_at literal ("YYYY-MM-DDTHH:mm") a "vie 5 jun · 11:00". */
export function formatSchedule(iso: string | null): string {
  if (!iso) return "Sin fecha";
  const y = +iso.slice(0, 4);
  const m = +iso.slice(5, 7) - 1;
  const d = +iso.slice(8, 10);
  const time = iso.slice(11, 16);
  const wd = new Date(`${iso.slice(0, 10)}T12:00:00`).getDay();
  return `${DIAS[wd]} ${d} ${MESES[m] ?? ""}${time ? ` · ${time}` : ""}`.trim();
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "recién";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function initials(name: string | null, phone: string): string {
  const base = name ?? phone;
  const parts = base.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.replace("+", "").slice(0, 2).toUpperCase();
}
