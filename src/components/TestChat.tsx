"use client";

import { ChatShell } from "@/components/ChatShell";

export function TestChat() {
  return (
    <ChatShell
      endpoint="/api/chat"
      placeholder="Escribe como un lead…"
      emptyState={
        <>
          Escribe como si fueras un lead que llega por WhatsApp. Leo responde con sus
          instrucciones y reglas reales.
        </>
      }
    />
  );
}
