"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ConversationSummary } from "@/lib/types";
import { timeAgo, initials, scoreLabel } from "@/lib/format";

const FILTERS = [
  { key: "all", label: "Todas" },
  { key: "hot", label: "🔥 Calientes" },
  { key: "warm", label: "🌤️ Templados" },
  { key: "cold", label: "❄️ Fríos" },
] as const;

export function ConversationsList({ items }: { items: ConversationSummary[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (filter !== "all" && c.lead?.score !== filter) return false;
      if (!q) return true;
      const hay = `${c.contact.name ?? ""} ${c.contact.phone} ${c.lastMessage?.content ?? ""}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [items, q, filter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <input
          className="input sm:max-w-xs"
          placeholder="Buscar por nombre, teléfono o mensaje…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3.5 py-2 rounded-xl text-sm transition border"
              style={
                filter === f.key
                  ? {
                      background: "linear-gradient(180deg,rgba(124,58,237,0.5),rgba(109,40,217,0.3))",
                      borderColor: "rgba(168,85,247,0.4)",
                      color: "#fff",
                    }
                  : {
                      background: "rgba(124,58,237,0.08)",
                      borderColor: "var(--color-edge-soft)",
                      color: "#b3aac6",
                    }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel divide-y divide-[var(--color-edge-soft)] overflow-hidden">
        {filtered.map((c) => (
          <Link
            key={c.contact.id}
            href={`/conversations/${c.contact.id}`}
            className="flex items-center gap-4 px-5 py-4 hover:bg-violet-500/5 transition"
          >
            <div
              className="size-11 rounded-full grid place-items-center text-sm font-bold text-white shrink-0 relative"
              style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}
            >
              {initials(c.contact.name, c.contact.phone)}
              {c.contact.blocked && (
                <span className="absolute -bottom-1 -right-1 size-4 rounded-full bg-rose-500 border-2 border-[#0b0710]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-violet-50 truncate">
                  {c.contact.name ?? c.contact.phone}
                </span>
                {c.contact.bot_enabled === false && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    bot apagado
                  </span>
                )}
              </div>
              <div className="text-sm text-violet-300/60 truncate">
                {c.lastMessage
                  ? `${c.lastMessage.role === "assistant" ? "Leo: " : ""}${c.lastMessage.content}`
                  : "Sin mensajes"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {c.lead && <span className={`chip chip-${c.lead.score}`}>{scoreLabel(c.lead.score)}</span>}
              <span className="text-[11px] text-violet-300/50">
                {c.lastMessage ? timeAgo(c.lastMessage.created_at) : ""}
              </span>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-violet-300/50 text-sm">
            No hay conversaciones que coincidan.
          </div>
        )}
      </div>
    </div>
  );
}
