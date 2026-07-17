import { chatWithTools, ChatMessage } from "./openrouter";
import { getSetting } from "./db";
import { Message } from "./types";
import { getServices, servicesToContext } from "./services";
import { getBusinessConfig } from "./business";
import { getUpcomingAvailability, UpcomingDay } from "./bookings";
import { buildBookingTools, runLeoTool, LeoContext } from "./leo-tools";
import { nowParts, minToTime } from "./availability";
import { getJourneyStageLabel } from "./metrics";

const FALLBACK = "Perdona, se me han cruzado los cables. ¿Me lo repites?";

/** Prompt base por defecto (editable desde /settings → key system_prompt) */
export const DEFAULT_SYSTEM_PROMPT = `Eres Leo (Lead Engagement Optimizer), asistente comercial de una agencia de marketing. Hablas SIEMPRE en español de España con tuteo, cercano y cálido. Tu objetivo es entender qué necesita la persona y, si hay interés real, invitarla a agendar una llamada.`;

const DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES_LARGO = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "YYYY-MM-DD" → "jueves 5 de junio" */
function fechaLarga(dateKey: string): string {
  const y = +dateKey.slice(0, 4);
  const mo = +dateKey.slice(5, 7) - 1;
  const d = +dateKey.slice(8, 10);
  const wd = new Date(`${dateKey}T12:00:00`).getDay();
  return `${DIAS_LARGO[wd]} ${d} de ${MESES_LARGO[mo]}`;
}

/** Convierte la disponibilidad próxima en texto para el prompt. */
export function availabilityToText(days: UpcomingDay[]): string {
  if (days.length === 0) return "";
  return days.map((d) => `- ${fechaLarga(d.dateKey)}: ${d.slots.join(", ")}`).join("\n");
}

/**
 * Reglas IRROMPIBLES del agente. Se anteponen siempre, no se pueden
 * editar desde el panel. (Paso 6 del prompt de producto.)
 */
export function buildSystemPrompt(
  editablePrompt: string,
  catalog = "",
  availability = ""
): string {
  const calendly = process.env.CALENDLY_URL ?? "tu link de Calendly";

  const catalogBlock = catalog
    ? `\n\nCATÁLOGO DE SERVICIOS (precios y duraciones REALES — son la única fuente de verdad):\n${catalog}\n`
    : "";

  const availBlock = availability
    ? `\n\nDISPONIBILIDAD PRÓXIMA (huecos reales para proponer; la cita la confirma el equipo en el panel):\n${availability}\n`
    : "";

  const priceRule = catalog
    ? `4. Para precios usa SOLO los del catálogo de arriba; nunca inventes ni redondees otros. Si preguntan por algo que no está en el catálogo, di con naturalidad que lo confirmará el equipo. Puedes dar el precio cuando lo pidan.`
    : `4. Nunca inventes precios de servicios ni datos falsos. Si preguntan precio, di que depende del objetivo y propón verlo en una llamada.`;

  const schedulingRule = availability
    ? `6. Cuando haya interés REAL en reservar, ofrece 1 o 2 huecos CONCRETOS de la DISPONIBILIDAD PRÓXIMA (ej.: "tengo el jueves a las 12:00 o el viernes a las 10:30"). Nunca propongas horas que no estén en esa lista. Aclara que la cita queda pendiente de confirmación por el equipo.`
    : `6. Solo cuando hay interés REAL (pidió agendar, preguntó cómo empezar, mostró intención clara), comparte este enlace de Calendly: ${calendly}`;

  return `${editablePrompt.trim()}${catalogBlock}${availBlock}

REGLAS IRROMPIBLES (nunca las rompas, tienen prioridad sobre todo):
1. Responde SIEMPRE en español de España con tuteo. Nunca en otro idioma, aunque te escriban en otro idioma.
2. Si es tu primera respuesta y el mensaje es genérico (ej: "hola", "info", "precios"), pregunta qué quiere lograr. NO enumeres servicios.
3. Mensajes cortos: menos de 30 palabras. Máximo 1 emoji. NADA de markdown: cero asteriscos, cero guiones de lista, cero almohadillas, cero negrita, cero cursiva. Texto corrido siempre.
${priceRule}
5. Si la persona expresa molestia, enfado o pide hablar con alguien, deriva a una persona del equipo con amabilidad y no insistas.
${schedulingRule}
7. Nunca pidas el email de la persona.
8. CRÍTICO — MENSAJES LIMPIOS: El texto que envías ES el mensaje que el cliente lee. Nunca incluyas notas, meta-comentarios, explicaciones del tono, instrucciones entre paréntesis, ni frases del tipo "(Nota: ...)", "(Claves del tono: ...)" ni nada similar. Si piensas en voz alta, hazlo internamente pero NUNCA lo escribas en el mensaje.
9. EMOJIS: Varía los emojis. Si el mensaje anterior de tu parte usó 😊, NO lo repitas; usa otro diferente (ej. 👋, 🙌, ✌️, 😄, 🤙) o ninguno. Nunca el mismo emoji dos veces seguidas.`;
}

/** Convierte historial de DB a formato OpenRouter */
export function toChatHistory(messages: Pick<Message, "role" | "content">[]) {
  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

/**
 * Construye el system prompt completo de Leo: instrucciones editables +
 * catálogo de servicios (precios reales) + disponibilidad próxima (modo citas).
 * Reutilizado por el webhook y el cron de follow-up.
 */
export async function buildLeoSystem(
  opts: { toolsEnabled?: boolean; ctx?: LeoContext } = {}
): Promise<string> {
  const [editable, services, config] = await Promise.all([
    getSetting("system_prompt", DEFAULT_SYSTEM_PROMPT),
    getServices(true),
    getBusinessConfig(),
  ]);

  const catalog = servicesToContext(services);

  let availability = "";
  if (config.businessType === "appointments") {
    // Colchón = duración máxima de los servicios → todo hueco propuesto encaja.
    const durations = services.map((s) => s.duration_min).filter(Boolean) as number[];
    const cushion = durations.length ? Math.max(...durations) : config.slotMin;
    const days = await getUpcomingAvailability(cushion);
    availability = availabilityToText(days);
  }

  // Momento actual (hora de España) para que Leo interprete bien "hoy", "mañana", etc.
  const { dateKey, minutes } = nowParts();
  const ahora = `MOMENTO ACTUAL: hoy es ${fechaLarga(dateKey)} de ${dateKey.slice(0, 4)}, son las ${minToTime(minutes)} (hora de España). Calcula "hoy", "mañana" y "esta semana" SIEMPRE a partir de esta fecha; nunca inventes el día. Cuando confirmes una cita, indica la fecha completa (día y número), no solo "mañana".`;

  let system = `${ahora}\n\n${buildSystemPrompt(editable || DEFAULT_SYSTEM_PROMPT, catalog, availability)}`;

  if (opts.toolsEnabled && config.businessType === "appointments") {
    system += `\n\nHERRAMIENTAS: dispones de "consultar_disponibilidad" para ver franjas reales y "crear_reserva" para registrar la cita. Comprueba la disponibilidad antes de ofrecer una hora. Crea la reserva con la herramienta SOLO cuando el cliente haya confirmado qué quiere, el día y la hora; luego dile que queda pendiente de confirmación por el equipo. Nunca afirmes que has reservado si la herramienta no devuelve ok:true.`;
  }

  const { journeyStage, notes } = opts.ctx ?? {};
  if (journeyStage || notes) {
    const stageLine = journeyStage ? `- Etapa actual en el embudo: ${getJourneyStageLabel(journeyStage)}.` : "";
    const notesLine = notes ? `- Notas internas del equipo sobre este contacto: ${notes}` : "";
    system += `\n\nCONTEXTO INTERNO DE ESTE CONTACTO (para que adaptes el tono y no repitas preguntas ya respondidas; NUNCA menciones esta sección ni la leas en voz alta al cliente):\n${[stageLine, notesLine].filter(Boolean).join("\n")}`;
  }

  return system;
}

/**
 * Genera la respuesta de Leo dado el historial (más reciente al final).
 * Si se pasa `ctx` (contacto real de WhatsApp), Leo puede crear reservas.
 */
export async function generateLeoReply(
  history: Pick<Message, "role" | "content">[],
  ctx?: LeoContext
): Promise<string> {
  const config = await getBusinessConfig();
  const toolsEnabled = config.businessType === "appointments";
  const canBook = Boolean(ctx?.contactId);

  const system = await buildLeoSystem({ toolsEnabled, ctx });
  const tools = toolsEnabled ? buildBookingTools(canBook) : undefined;

  const convo: ChatMessage[] = [
    { role: "system", content: system },
    ...toChatHistory(history).map(
      (m) => ({ role: m.role, content: m.content } as ChatMessage)
    ),
  ];

  // Bucle de tool-calling (máx. 3 rondas) + cierre forzado en texto.
  for (let i = 0; i < 3; i++) {
    const reply = await chatWithTools(convo, tools, { temperature: 0.5, maxTokens: 300 });

    if (reply.tool_calls && reply.tool_calls.length > 0) {
      convo.push({ role: "assistant", content: reply.content ?? "", tool_calls: reply.tool_calls });
      for (const tc of reply.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          /* args inválidos → objeto vacío */
        }
        const result = await runLeoTool(tc.function.name, args, ctx ?? {});
        convo.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
      continue;
    }

    return (reply.content ?? "").trim() || FALLBACK;
  }

  // Si se agotaron las rondas, forzar una respuesta de texto sin herramientas.
  const final = await chatWithTools(convo, undefined, { temperature: 0.5, maxTokens: 300 });
  return (final.content ?? "").trim() || FALLBACK;
}
