/**
 * Integración con Brevo (email marketing).
 * Requiere BREVO_API_KEY en las variables de entorno.
 */

const BREVO_BASE = "https://api.brevo.com/v3";

export function isBrevoConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

function headers(): Record<string, string> {
  return {
    "api-key": process.env.BREVO_API_KEY ?? "",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export interface BrevoList {
  id: number;
  name: string;
  totalSubscribers: number;
}

/** Listas de contactos de la cuenta Brevo (para el desplegable del importador). */
export async function getBrevoLists(): Promise<BrevoList[]> {
  const res = await fetch(`${BREVO_BASE}/contacts/lists?limit=50&offset=0`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo lists error ${res.status}: ${body.slice(0, 200)}`);
  }
  const j = (await res.json()) as { lists?: { id: number; name: string; totalSubscribers?: number }[] };
  return (j.lists ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    totalSubscribers: l.totalSubscribers ?? 0,
  }));
}

export interface BrevoImportContact {
  email: string;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Importación masiva a una lista de Brevo (endpoint asíncrono /contacts/import).
 * Una sola llamada admite miles de contactos; Brevo los procesa en segundo plano.
 * Devuelve el processId del trabajo de importación.
 */
export async function importContactsToBrevo(
  contacts: BrevoImportContact[],
  listId: number
): Promise<{ processId: number }> {
  if (contacts.length === 0) throw new Error("No hay contactos con email para enviar a Brevo.");

  const res = await fetch(`${BREVO_BASE}/contacts/import`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      jsonBody: contacts.map((c) => ({ email: c.email, attributes: c.attributes ?? {} })),
      listIds: [listId],
      updateExistingContacts: true,
      emptyContactsAttributes: false,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Brevo import error ${res.status}: ${body.slice(0, 300)}`);
  }
  const j = (await res.json()) as { processId: number };
  return { processId: j.processId };
}
