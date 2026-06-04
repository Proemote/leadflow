import { chatCompletion } from "./openrouter";
import { LeadScore, Message } from "./types";
import { toChatHistory } from "./leo";

const QUALIFY_PROMPT = `Eres un evaluador de leads de una agencia. Analiza la conversación entre un usuario y el asistente (Leo) y clasifica al usuario en una de estas categorías:

- "hot": interés real en contratar. Preguntó por precios para avanzar, pidió reunión/llamada, o mostró intención clara de empezar.
- "warm": tiene una necesidad o problema real pero todavía no ha querido agendar ni avanzar.
- "cold": sin interés real. Spam, busca empleo, curiosidad, mensajes vacíos, o no es el público objetivo.

Responde ÚNICAMENTE con un JSON válido en una línea, sin texto adicional, con esta forma:
{"score":"hot|warm|cold","reason":"motivo breve en español de España, máx. 20 palabras"}`;

export interface Qualification {
  score: LeadScore;
  reason: string;
}

/**
 * Califica un lead a partir del historial. Devuelve null si falla
 * el parseo (para no romper el flujo del webhook).
 */
export async function qualifyLead(
  history: Pick<Message, "role" | "content">[]
): Promise<Qualification | null> {
  try {
    const transcript = toChatHistory(history)
      .map((m) => `${m.role === "user" ? "Usuario" : "Leo"}: ${m.content}`)
      .join("\n");

    const raw = await chatCompletion(
      [
        { role: "system", content: QUALIFY_PROMPT },
        { role: "user", content: `Conversación:\n${transcript}` },
      ],
      { temperature: 0.1, maxTokens: 120 }
    );

    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!["hot", "warm", "cold"].includes(parsed.score)) return null;

    return {
      score: parsed.score as LeadScore,
      reason: String(parsed.reason ?? "").slice(0, 240) || "Sin motivo.",
    };
  } catch {
    return null;
  }
}
