/** Formatea céntimos a moneda (por defecto EUR, formato España). */
export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Convierte un texto de euros ("25", "25,50", "25.5") a céntimos. */
export function parsePriceToCents(input: string): number {
  const normalized = input.replace(/[^0-9.,]/g, "").replace(",", ".");
  const value = parseFloat(normalized);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}
