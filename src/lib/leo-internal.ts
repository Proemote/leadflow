import { chatWithTools, ChatMessage, ToolDef } from "./openrouter";
import { getSetting, getConversationsForUser, getConversationForUser } from "./db";
import { getOpportunitiesForUser } from "./opportunities";
import { getBookingsForUser } from "./bookings";
import { getCustomersForUser } from "./customers";
import { PIPELINE_STAGES, CustomerSummary } from "./types";
import { nowParts, dateKeyOf, minToTime } from "./availability";
import { formatPrice } from "./money";
import { scoreLabel } from "./format";
import { getJourneyStageLabel } from "./metrics";

const FALLBACK = "Perdona, se me han cruzado los cables. ¿Me lo repites?";

/** Clave en la tabla settings (separada del system_prompt de WhatsApp). */
export const INTERNAL_PROMPT_KEY = "internal_assistant_prompt";

/** Prompt base por defecto (editable desde Leo → Asistente interno). */
export const DEFAULT_INTERNAL_PROMPT = `Eres Leo, pero ahora hablando directamente con Carlos, el dueño de Proemote y de LeadFlow AI — no con un lead. Tu trabajo es ayudarle a entender el estado de su negocio (leads calientes, oportunidades, agenda) y a redactar mensajes de seguimiento cuando te lo pida.

Reglas:
- Nunca envías mensajes de WhatsApp ni ejecutas ninguna acción; si Carlos te pide "envía esto", redacta el texto y aclara que debe enviarlo él mismo.
- Nunca inventas datos: si no tienes la información, dilo, no la completes con suposiciones.
- Sé directo y breve, como un asistente de confianza, no como un vendedor.`;

/**
 * Herramientas del asistente interno. TODAS son de solo lectura sobre el
 * CRM: no existe ninguna que cree, edite o borre registros ni que envíe
 * mensajes reales. `redactar_borrador` solo devuelve contexto para que el
 * modelo escriba el texto dentro del chat.
 */
export function buildInternalTools(): ToolDef[] {
  return [
    {
      type: "function",
      function: {
        name: "consultar_leads_calientes",
        description:
          "Devuelve los leads marcados como calientes (y templados) con su última interacción por WhatsApp. Úsala cuando Carlos pregunte por leads calientes, pendientes o a quién contactar.",
        parameters: { type: "object", properties: {} },
      },
    },
    {
      type: "function",
      function: {
        name: "consultar_oportunidades",
        description:
          "Devuelve las oportunidades del pipeline de ventas con su etapa, valor y cierre estimado. Opcionalmente filtradas por etapa.",
        parameters: {
          type: "object",
          properties: {
            etapa: {
              type: "string",
              description: `Etapa del pipeline para filtrar (opcional). Valores válidos: ${PIPELINE_STAGES.join(", ")}.`,
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "consultar_agenda",
        description:
          "Devuelve las citas/reservas activas de un día concreto. Si no se pasa fecha, devuelve las de hoy.",
        parameters: {
          type: "object",
          properties: {
            fecha: { type: "string", description: "Fecha en formato YYYY-MM-DD (opcional, por defecto hoy)." },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "consultar_contacto",
        description:
          "Devuelve la ficha resumida de un contacto concreto: estado, CLV, etapa del journey, notas internas y últimas interacciones. Acepta el nombre o el id del contacto.",
        parameters: {
          type: "object",
          properties: {
            nombre_o_id: { type: "string", description: "Nombre (o parte del nombre) o id del contacto." },
          },
          required: ["nombre_o_id"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "redactar_borrador",
        description:
          "Recupera el contexto de un contacto para redactar un borrador de mensaje de seguimiento. NO envía nada: tras llamarla, escribe tú el borrador dentro del chat entre las líneas [BORRADOR] y [/BORRADOR]. Úsala cuando Carlos pida redactar un seguimiento para alguien.",
        parameters: {
          type: "object",
          properties: {
            contacto_id: { type: "string", description: "Id o nombre del contacto destinatario." },
            contexto: { type: "string", description: "Qué quiere conseguir Carlos con el mensaje (opcional)." },
          },
          required: ["contacto_id"],
        },
      },
    },
  ];
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

/** Busca un contacto por id exacto o por nombre (aprox.) en la cartera del usuario. */
function findCustomer(customers: CustomerSummary[], query: string): CustomerSummary | null {
  if (!query) return null;
  const byId = customers.find((c) => c.contact.id === query);
  if (byId) return byId;
  const q = norm(query);
  const fullName = (c: CustomerSummary) =>
    norm([c.contact.name, c.contact.surname].filter(Boolean).join(" "));
  return (
    customers.find((c) => fullName(c) === q) ??
    customers.find((c) => fullName(c).includes(q) || q.includes(fullName(c))) ??
    customers.find((c) => (c.contact.phone ?? "").includes(query)) ??
    null
  );
}

/** Ficha resumida serializable de un contacto (reutiliza las métricas del listado de Contactos). */
async function contactSummary(userId: string, c: CustomerSummary) {
  const convo = await getConversationForUser(userId, c.contact.id).catch(() => null);
  const lastMessages = (convo?.messages ?? [])
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-5)
    .map((m) => ({
      de: m.role === "user" ? "cliente" : "Leo",
      fecha: m.created_at.slice(0, 16).replace("T", " "),
      texto: m.content,
    }));
  return {
    id: c.contact.id,
    nombre: [c.contact.name, c.contact.surname].filter(Boolean).join(" ") || null,
    telefono: c.contact.phone,
    email: c.contact.email ?? null,
    empresa: c.contact.company ?? null,
    etiquetas: c.contact.tags ?? [],
    etapa_journey: c.contact.journey_stage ? getJourneyStageLabel(c.contact.journey_stage) : null,
    estado: c.metrics.estado,
    clv: formatPrice(c.metrics.clvCents),
    n_operaciones: c.metrics.nOps,
    dias_sin_actividad: c.metrics.recenciaDias,
    cliente_desde: c.metrics.clienteDesde,
    notas_internas: c.contact.notes ?? null,
    lead: convo?.lead ? { score: scoreLabel(convo.lead.score), motivo: convo.lead.reason } : null,
    ultimas_interacciones: lastMessages,
  };
}

/** Ejecuta una herramienta de solo lectura y devuelve un objeto serializable. */
export async function runInternalTool(
  name: string,
  args: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>> {
  if (name === "consultar_leads_calientes") {
    const conversations = await getConversationsForUser(userId);
    const leads = conversations
      .filter((c) => c.lead?.score === "hot" || c.lead?.score === "warm")
      .sort((a, b) => (a.lead!.score === "hot" ? -1 : 1))
      .map((c) => ({
        contacto_id: c.contact.id,
        nombre: c.contact.name ?? c.contact.phone,
        telefono: c.contact.phone,
        temperatura: scoreLabel(c.lead!.score),
        motivo: c.lead!.reason,
        ultima_interaccion: c.lastMessage
          ? {
              de: c.lastMessage.role === "user" ? "cliente" : "Leo",
              fecha: c.lastMessage.created_at.slice(0, 16).replace("T", " "),
              texto: c.lastMessage.content,
              pendiente_de_respuesta: c.lastMessage.role === "user",
            }
          : null,
      }));
    return { total: leads.length, leads };
  }

  if (name === "consultar_oportunidades") {
    const { opportunities } = await getOpportunitiesForUser(userId);
    const etapa = args.etapa ? String(args.etapa) : null;
    const stage = etapa
      ? PIPELINE_STAGES.find((s) => norm(s) === norm(etapa)) ?? null
      : null;
    if (etapa && !stage) {
      return { error: "Etapa no válida.", etapas_validas: [...PIPELINE_STAGES] };
    }
    const list = (stage ? opportunities.filter((o) => o.stage === stage) : opportunities).map((o) => ({
      id: o.id,
      titulo: o.title,
      contacto: o.contact_name ?? null,
      contacto_id: o.contact_id,
      etapa: o.stage,
      valor: formatPrice(o.value_cents),
      probabilidad: `${o.probability}%`,
      cierre_estimado: o.expected_close ? o.expected_close.slice(0, 10) : null,
    }));
    return { total: list.length, etapa_filtrada: stage ?? "todas", oportunidades: list };
  }

  if (name === "consultar_agenda") {
    const { dateKey: today } = nowParts();
    const fecha = args.fecha ? String(args.fecha) : today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return { error: "La fecha debe ser YYYY-MM-DD." };
    }
    const bookings = await getBookingsForUser(userId);
    const isActive = (s: string) => s === "pending" || s === "confirmed";
    const citas = bookings
      .filter((b) => b.scheduled_at && dateKeyOf(b.scheduled_at) === fecha && isActive(b.status))
      .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
      .map((b) => ({
        hora: b.scheduled_at!.slice(11, 16),
        cliente: b.customer_name,
        servicio: b.service_name ?? null,
        estado: b.status === "confirmed" ? "confirmada" : "pendiente",
        notas: b.notes ?? null,
      }));
    return { fecha, es_hoy: fecha === today, total: citas.length, citas };
  }

  if (name === "consultar_contacto") {
    const query = String(args.nombre_o_id ?? "");
    const { customers } = await getCustomersForUser(userId);
    const found = findCustomer(customers, query);
    if (!found) {
      return {
        error: `No he encontrado ningún contacto que coincida con "${query}".`,
        sugerencia: "Prueba con el nombre completo o revisa la ortografía.",
      };
    }
    return { contacto: await contactSummary(userId, found) };
  }

  if (name === "redactar_borrador") {
    const query = String(args.contacto_id ?? "");
    const { customers } = await getCustomersForUser(userId);
    const found = findCustomer(customers, query);
    if (!found) {
      return { error: `No he encontrado ningún contacto que coincida con "${query}".` };
    }
    return {
      contacto: await contactSummary(userId, found),
      contexto_de_carlos: args.contexto ? String(args.contexto) : null,
      instrucciones:
        "Redacta AHORA tú el borrador del mensaje de seguimiento usando este contexto. Preséntalo entre una línea [BORRADOR] y otra [/BORRADOR] (solo el texto listo para enviar dentro, en el tono de WhatsApp: cercano, corto, sin markdown). Este borrador NO se envía: recuérdale a Carlos que debe enviarlo él mismo.",
    };
  }

  return { error: `Herramienta desconocida: ${name}` };
}

/**
 * System prompt del asistente interno: instrucciones editables (settings)
 * + reglas fijas de solo lectura. Independiente del prompt de WhatsApp.
 */
export async function buildInternalSystem(): Promise<string> {
  const editable = await getSetting(INTERNAL_PROMPT_KEY, DEFAULT_INTERNAL_PROMPT);

  const { dateKey, minutes } = nowParts();
  const ahora = `MOMENTO ACTUAL: hoy es ${dateKey}, son las ${minToTime(minutes)} (hora de España). Calcula "hoy", "mañana" y "esta semana" siempre a partir de esta fecha.`;

  return `${ahora}

${(editable || DEFAULT_INTERNAL_PROMPT).trim()}

REGLAS FIJAS DEL ASISTENTE INTERNO (prioridad máxima, nunca las rompas):
1. Tus herramientas son de SOLO LECTURA sobre el CRM. No puedes crear, editar ni borrar nada, ni enviar mensajes de WhatsApp. Nunca afirmes haber enviado un mensaje o modificado un dato.
2. Responde solo con datos que devuelvan las herramientas. Si no tienes la información, dilo claramente; no la inventes ni la completes con suposiciones.
3. Cuando redactes un borrador de mensaje, preséntalo SIEMPRE entre una línea [BORRADOR] y otra [/BORRADOR] con el texto listo para copiar dentro, y aclara que Carlos debe enviarlo él mismo.
4. Habla en español de España, con tuteo, directo y breve.`;
}

/**
 * Genera la respuesta del asistente interno. Mismo patrón de bucle de
 * tool-calling que generateLeoReply (lib/leo.ts), con las herramientas
 * de solo lectura de buildInternalTools().
 */
export async function generateInternalReply(
  userId: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const system = await buildInternalSystem();
  const tools = buildInternalTools();

  const convo: ChatMessage[] = [
    { role: "system", content: system },
    ...history.map((m) => ({ role: m.role, content: m.content } as ChatMessage)),
  ];

  // Bucle de tool-calling (máx. 4 rondas) + cierre forzado en texto.
  for (let i = 0; i < 4; i++) {
    const reply = await chatWithTools(convo, tools, { temperature: 0.4, maxTokens: 700 });

    if (reply.tool_calls && reply.tool_calls.length > 0) {
      convo.push({ role: "assistant", content: reply.content ?? "", tool_calls: reply.tool_calls });
      for (const tc of reply.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          /* args inválidos → objeto vacío */
        }
        const result = await runInternalTool(tc.function.name, args, userId);
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    return (reply.content ?? "").trim() || FALLBACK;
  }

  const final = await chatWithTools(convo, undefined, { temperature: 0.4, maxTokens: 700 });
  return (final.content ?? "").trim() || FALLBACK;
}
