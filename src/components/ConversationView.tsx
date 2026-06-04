"use client";

import { useState } from "react";
import Link from "next/link";
import { Contact, Lead, Message } from "@/lib/types";
import { clockTime, initials, scoreLabel } from "@/lib/format";
import { IconBack, IconBlock, IconSend, IconCheck } from "@/components/icons";

export function ConversationView({
  contact: initialContact,
  messages: initialMessages,
  lead,
  demo,
}: {
  contact: Contact;
  messages: Message[];
  lead: Lead | null;
  demo: boolean;
}) {
  const [contact, setContact] = useState(initialContact);
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);

  async function patchContact(patch: Partial<Contact>) {
    setContact((c) => ({ ...c, ...patch }));
    if (demo) return;
    setBusy(true);
    try {
      await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      contact_id: contact.id,
      role: "assistant",
      content: body,
      created_at: new Date().toISOString(),
      whatsapp_message_id: null,
      status: "sent",
    };
    setMessages((m) => [...m, optimistic]);
    setText("");
    try {
      if (!demo) {
        await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contactId: contact.id, text: body }),
        });
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-180px)]">
      {/* Columna chat */}
      <div className="panel flex flex-col min-h-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-edge-soft)]">
          <Link href="/conversations" className="lg:hidden text-violet-300">
            <IconBack />
          </Link>
          <div
            className="size-10 rounded-full grid place-items-center text-sm font-bold text-white"
            style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}
          >
            {initials(contact.name, contact.phone)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-violet-50 truncate">
              {contact.name ?? contact.phone}
            </div>
            <div className="text-xs text-violet-300/60">{contact.phone}</div>
          </div>
          {lead && <span className={`chip chip-${lead.score}`}>{scoreLabel(lead.score)}</span>}
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[rgba(124,58,237,0.12)] border border-[var(--color-edge)] rounded-bl-md"
                    : "text-white rounded-br-md"
                }`}
                style={
                  m.role === "assistant"
                    ? { background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }
                    : undefined
                }
              >
                <div>{m.content}</div>
                <div className="flex items-center gap-1 justify-end mt-1 text-[10px] opacity-70">
                  {clockTime(m.created_at)}
                  {m.role === "assistant" && m.status && (
                    <span>
                      {m.status === "read" ? "✓✓" : m.status === "delivered" ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-center text-violet-300/50 text-sm py-10">
              Aún no hay mensajes.
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-4 py-3 border-t border-[var(--color-edge-soft)] flex gap-2">
          <input
            className="input"
            placeholder={
              contact.bot_enabled === false
                ? "Bot apagado — escribes tú como operador…"
                : "Escribir mensaje manual…"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn-primary flex items-center gap-2" onClick={send} disabled={sending || !text.trim()}>
            <IconSend width={16} height={16} />
          </button>
        </div>
      </div>

      {/* Columna info */}
      <div className="space-y-5 overflow-y-auto">
        <div className="panel p-5">
          <h3 className="font-semibold text-violet-50 mb-3">Lead</h3>
          {lead ? (
            <>
              <span className={`chip chip-${lead.score} mb-3`}>{scoreLabel(lead.score).toUpperCase()}</span>
              <p className="text-sm text-violet-200/80 leading-relaxed">{lead.reason}</p>
            </>
          ) : (
            <p className="text-sm text-violet-300/50">
              Sin cualificar (se evalúa tras 3 o más mensajes del usuario).
            </p>
          )}
        </div>

        <div className="panel p-5 space-y-3 text-sm">
          <h3 className="font-semibold text-violet-50">Datos</h3>
          <Row label="Teléfono" value={contact.phone} />
          <Row label="Origen" value={contact.ad_source ?? "Directo"} />
          {contact.ctwa_clid && <Row label="CTWA" value={contact.ctwa_clid} />}
          <Row
            label="Alta"
            value={new Date(contact.created_at).toLocaleDateString("es-ES")}
          />
        </div>

        <div className="panel p-5 space-y-3">
          <h3 className="font-semibold text-violet-50">Acciones</h3>

          {/* Toggle Bot */}
          <button
            disabled={busy}
            onClick={() => patchContact({ bot_enabled: !contact.bot_enabled })}
            className="w-full flex items-center justify-between panel-tight px-4 py-3 hover:border-violet-500/40 transition"
          >
            <span className="text-sm text-violet-100">Bot (Leo) automático</span>{/* respuesta automática */}
            <span
              className="relative w-11 h-6 rounded-full transition"
              style={{
                background: contact.bot_enabled
                  ? "linear-gradient(90deg,#8b5cf6,#6d28d9)"
                  : "rgba(124,58,237,0.2)",
              }}
            >
              <span
                className="absolute top-0.5 size-5 rounded-full bg-white transition-all"
                style={{ left: contact.bot_enabled ? "1.4rem" : "0.15rem" }}
              />
            </span>
          </button>

          {/* Bloquear */}
          <button
            disabled={busy}
            onClick={() => patchContact({ blocked: !contact.blocked })}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition border"
            style={
              contact.blocked
                ? { background: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.3)", color: "#6ee7b7" }
                : { background: "rgba(244,63,94,0.12)", borderColor: "rgba(244,63,94,0.3)", color: "#fb7185" }
            }
          >
            {contact.blocked ? <IconCheck width={16} height={16} /> : <IconBlock width={16} height={16} />}
            {contact.blocked ? "Desbloquear contacto" : "Bloquear contacto"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-violet-300/60">{label}</span>
      <span className="text-violet-100 text-right truncate">{value}</span>
    </div>
  );
}
