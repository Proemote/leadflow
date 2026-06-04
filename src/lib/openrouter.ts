export interface ToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolCall {
  id: string;
  type?: string;
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface AssistantReply {
  content: string | null;
  tool_calls?: ToolCall[];
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "https://leadflow.ai",
    "X-Title": "LeadFlow AI · Leo",
  };
}

/**
 * Llama a OpenRouter (DeepSeek por defecto) y devuelve solo el texto.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<string> {
  const reply = await chatWithTools(messages, undefined, opts);
  return (reply.content ?? "").trim();
}

/**
 * Llama a OpenRouter devolviendo el mensaje completo del asistente
 * (texto y/o tool_calls). Lanza si no hay OPENROUTER_API_KEY.
 */
export async function chatWithTools(
  messages: ChatMessage[],
  tools?: ToolDef[],
  opts: { temperature?: number; maxTokens?: number; model?: string } = {}
): Promise<AssistantReply> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("Falta OPENROUTER_API_KEY");

  const model =
    opts.model ?? process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-chat-v3-0324";

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.maxTokens ?? 400,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: headers(apiKey),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${txt}`);
  }

  const json = await res.json();
  const msg = json.choices?.[0]?.message ?? {};
  return {
    content: msg.content ?? null,
    tool_calls: msg.tool_calls ?? undefined,
  };
}
