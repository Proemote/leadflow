"use client";

import { useState, useRef, useEffect } from "react";
import { IconSend } from "@/components/icons";

type Msg = { role: "user" | "assistant"; content: string };

export function TestChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const body = text.trim();
    if (!body || loading) return;
    const next = [...messages, { role: "user" as const, content: body }];
    setMessages(next);
    setText("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Error");
      setMessages((m) => [...m, { role: "assistant", content: j.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel flex flex-col h-[calc(100vh-230px)] max-w-2xl">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        {messages.length === 0 && (
          <div className="h-full grid place-items-center text-center">
            <div className="text-violet-300/50 text-sm max-w-xs">
              Escribe como si fueras un lead que llega por WhatsApp. Leo responde con sus
              instrucciones y reglas reales.
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "text-white rounded-br-md"
                  : "bg-[rgba(124,58,237,0.12)] border border-[var(--color-edge)] rounded-bl-md"
              }`}
              style={m.role === "user" ? { background: "linear-gradient(135deg,#7c3aed,#6d28d9)" } : undefined}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-[rgba(124,58,237,0.12)] border border-[var(--color-edge)]">
              <span className="flex gap-1">
                <Dot /> <Dot d={0.15} /> <Dot d={0.3} />
              </span>
            </div>
          </div>
        )}
        {error && <div className="text-sm text-rose-400 text-center">{error}</div>}
        <div ref={endRef} />
      </div>
      <div className="px-4 py-3 border-t border-[var(--color-edge-soft)] flex gap-2">
        <input
          className="input"
          placeholder="Escribe como un lead…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn-primary" onClick={send} disabled={loading || !text.trim()}>
          <IconSend width={16} height={16} />
        </button>
      </div>
    </div>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <span
      className="size-1.5 rounded-full bg-violet-300 inline-block animate-bounce"
      style={{ animationDelay: `${d}s` }}
    />
  );
}
