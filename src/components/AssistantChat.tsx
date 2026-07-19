"use client";

import { useState, ReactNode } from "react";
import { ChatShell } from "@/components/ChatShell";
import { IconCheck } from "@/components/icons";

/**
 * Chat interno de Carlos con Leo (/asistente). Misma UI que el Chat de
 * prueba, pero contra /api/assistant-chat (instrucciones y herramientas de
 * solo lectura propias). Los bloques [BORRADOR]…[/BORRADOR] se muestran
 * como borradores con botón "Copiar" — nunca se envían automáticamente.
 */
export function AssistantChat() {
  return (
    <ChatShell
      endpoint="/api/assistant-chat"
      placeholder="Pregunta por tus leads, oportunidades o agenda…"
      emptyState={
        <>
          Habla con Leo sobre tu negocio: leads calientes, oportunidades, agenda o pídele
          que te redacte un seguimiento. Solo consulta datos — nunca envía nada.
        </>
      }
      renderAssistant={renderWithDrafts}
    />
  );
}

const DRAFT_RE = /\[BORRADOR\]([\s\S]*?)\[\/BORRADOR\]/g;

/** Separa el texto normal de los bloques [BORRADOR]…[/BORRADOR]. */
function renderWithDrafts(content: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of content.matchAll(DRAFT_RE)) {
    const before = content.slice(last, m.index).trim();
    if (before) parts.push(<Plain key={`t${i}`} text={before} />);
    parts.push(<DraftBlock key={`d${i}`} text={m[1].trim()} />);
    last = m.index! + m[0].length;
    i++;
  }
  const after = content.slice(last).trim();
  if (after) parts.push(<Plain key={`t${i}-end`} text={after} />);
  return parts.length > 0 ? <div className="space-y-2">{parts}</div> : content;
}

function Plain({ text }: { text: string }) {
  return <div className="whitespace-pre-wrap">{text}</div>;
}

function DraftBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
  }

  return (
    <div className="panel-tight p-3 border border-[var(--color-edge)]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-violet-300/60">
          ✍️ Borrador — no enviado
        </span>
        <button
          type="button"
          onClick={copy}
          className="btn-ghost px-2.5 py-1 text-xs flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <IconCheck width={13} height={13} /> Copiado
            </>
          ) : (
            "Copiar"
          )}
        </button>
      </div>
      <div className="whitespace-pre-wrap text-violet-50">{text}</div>
    </div>
  );
}
