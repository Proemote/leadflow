/**
 * Utilidades de parseo para el importador masivo de contactos.
 * Solo código cliente-seguro (sin dependencias de servidor).
 */

/** Campos destino de una fila importada. */
export const IMPORT_FIELDS = [
  { key: "name", label: "Nombre" },
  { key: "company", label: "Empresa" },
  { key: "location", label: "Ubicación" },
  { key: "phone", label: "Teléfono" },
  { key: "email", label: "Email" },
  { key: "google_maps_url", label: "Ficha Google" },
  { key: "website", label: "Web" },
  { key: "social_links", label: "Redes sociales" },
  { key: "notes", label: "Notas" },
] as const;

export type ImportFieldKey = (typeof IMPORT_FIELDS)[number]["key"];

export interface ImportRow {
  name: string;
  company: string | null;
  location: string | null;
  phone: string | null;
  email: string | null;
  google_maps_url: string | null;
  website: string | null;
  social_links: string[];
  notes: string | null;
}

/**
 * Parser CSV robusto: comillas, saltos de línea dentro de celdas y
 * autodetección del separador (`,` o `;` — Excel en español exporta con `;`).
 */
export function parseCsv(text: string): string[][] {
  // Quitar BOM si existe
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  if (tabs > commas && tabs > semis) return "\t";
  return semis > commas ? ";" : ",";
}

/** Normaliza un encabezado para comparación (sin tildes, minúsculas, sin símbolos). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_PATTERNS: Record<ImportFieldKey, string[]> = {
  name: ["nombre", "name", "contacto", "cliente", "negocio", "titulo", "title", "businessname"],
  company: ["empresa", "company", "razonsocial", "comercio", "marca"],
  location: ["ubicacion", "localidad", "ciudad", "direccion", "address", "location", "city", "poblacion", "municipio", "zona"],
  phone: ["telefono", "phone", "movil", "tel", "celular", "whatsapp", "numero", "phonenumber"],
  email: ["email", "correo", "mail", "emailaddress", "correoelectronico"],
  google_maps_url: ["fichagoogle", "google", "maps", "googlemaps", "urlgoogle", "urlficha", "fichadegoogle", "googlemybusiness", "gmb", "mapsurl", "urlmaps"],
  website: ["web", "website", "sitioweb", "url", "pagina", "paginaweb", "site", "dominio"],
  social_links: ["redes", "redessociales", "social", "socialmedia", "instagram", "facebook", "linkedin", "tiktok", "twitter", "rrss"],
  notes: ["notas", "notes", "observaciones", "comentarios", "descripcion"],
};

/**
 * Autodetecta a qué campo corresponde cada columna del archivo.
 * Devuelve un mapa índiceColumna → campo (o null si no se reconoce).
 */
export function autoDetectMapping(headerRow: string[]): (ImportFieldKey | null)[] {
  const used = new Set<ImportFieldKey>();
  return headerRow.map((h) => {
    const n = norm(h);
    if (!n) return null;
    for (const [field, patterns] of Object.entries(HEADER_PATTERNS) as [ImportFieldKey, string[]][]) {
      // social_links admite varias columnas (instagram + facebook + …)
      if (used.has(field) && field !== "social_links") continue;
      if (patterns.some((p) => n === p || n.includes(p))) {
        used.add(field);
        return field;
      }
    }
    return null;
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s.trim());
}

/** Normaliza un teléfono: quita espacios/guiones/puntos y prefija +34 si parece español sin prefijo. */
export function normalizePhone(raw: string): string | null {
  let p = raw.replace(/[\s\-().]/g, "");
  if (!p) return null;
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (/^[679]\d{8}$/.test(p)) p = "+34" + p; // móvil/fijo español de 9 dígitos
  if (!/^\+?\d{7,15}$/.test(p)) return null;
  return p;
}

/**
 * Convierte las filas crudas del archivo en ImportRow según el mapeo elegido.
 * Filtra filas sin nombre y sin ningún dato de contacto.
 */
export function buildRows(
  dataRows: string[][],
  mapping: (ImportFieldKey | null)[]
): { rows: ImportRow[]; skipped: number } {
  const rows: ImportRow[] = [];
  let skipped = 0;

  for (const raw of dataRows) {
    const r: ImportRow = {
      name: "", company: null, location: null, phone: null, email: null,
      google_maps_url: null, website: null, social_links: [], notes: null,
    };
    mapping.forEach((field, i) => {
      const val = (raw[i] ?? "").trim();
      if (!field || !val) return;
      if (field === "social_links") {
        // Una celda puede contener varias URLs separadas por coma/espacio/nueva línea
        const parts = val.split(/[,\n|]+/).map((s) => s.trim()).filter(Boolean);
        r.social_links.push(...parts);
      } else if (field === "phone") {
        r.phone = normalizePhone(val) ?? val;
      } else if (field === "email") {
        r.email = isValidEmail(val) ? val.toLowerCase() : null;
      } else {
        r[field] = val;
      }
    });

    const hasName = r.name.trim().length > 0;
    const hasAnyData = Boolean(r.phone || r.email || r.website || r.google_maps_url || r.company);
    if (!hasName && !hasAnyData) { skipped++; continue; }
    if (!hasName) r.name = r.company ?? r.email ?? r.phone ?? "Sin nombre";
    rows.push(r);
  }
  return { rows, skipped };
}
