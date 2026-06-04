# LeadFlow AI · WhatsApp CRM con Agente IA (Leo)

CRM de WhatsApp con agente IA integrado: panel de conversaciones, calificación
automática de leads y follow-up automático.

**Stack:** Next.js 16 (App Router) · Supabase · WhatsApp Business API (Meta) ·
OpenRouter (DeepSeek) · Resend · Vercel.

---

## Correr en local (modo demo)

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 . Sin variables de entorno, la app arranca en **modo
demo** con datos de ejemplo para que veas el panel. Para conectar tu backend real
copiá `.env.example` a `.env.local` y completá las variables.

---

## Estructura

```
src/
  app/
    (panel)/                 Panel protegido (sidebar + topbar)
      dashboard/             Métricas: leads hot/warm/cold, fuentes, actividad
      conversations/         Lista + detalle de conversaciones
      settings/              Editor del system prompt de Leo
      test-chat/             Probar a Leo sin WhatsApp real
    api/
      webhook/               GET verifica · POST mensajes y estados de Meta
      chat/                  Test chat
      send/                  Envío manual del operador
      contacts/[id]/         Bloquear / toggle bot
      settings/              Guardar prompt
      auth/callback/         Magic link de Supabase
      cron/notify/           Digest diario (21:00 UTC)
      cron/followup/         Follow-ups (13/17/21 UTC, ventana 10–20 ARG)
    login/                   Magic link
  components/                Sidebar, Topbar, charts, vistas
  lib/                       db, berta, leads, whatsapp, openrouter, email
supabase/schema.sql          Schema completo
vercel.json                  Crons
```

## Puesta en marcha (resumen)

1. **Meta Developers** — crear app Business + producto WhatsApp. Obtener
   `WHATSAPP_PHONE_NUMBER_ID` y token permanente (`WHATSAPP_ACCESS_TOKEN`).
2. **Supabase** — crear proyecto, ejecutar `supabase/schema.sql`, copiar URLs y keys.
3. **OpenRouter** — crear API key (`OPENROUTER_API_KEY`), modelo
   `deepseek/deepseek-chat-v3-0324`.
4. **Resend** — verificar dominio, obtener `RESEND_API_KEY`, setear `NOTIFY_EMAIL`.
5. **Vercel** — deploy con todas las env vars de `.env.example`.
6. **Webhook** — en Meta, URL `https://tu-app.vercel.app/api/webhook`, token =
   `WHATSAPP_VERIFY_TOKEN`. Suscribir `messages`, `message_deliveries`, `message_reads`.
7. Pasar la app de Meta a **Activo** y pedir permiso `whatsapp_business_messaging`.

## Flujo

Mensaje entrante → `/api/webhook` → crea/busca contacto → guarda mensaje → arma
historial (20 últimos) → Leo responde con DeepSeek → envía por WhatsApp (guarda
wamid) → tras 3+ mensajes del usuario, califica el lead → si **HOT**, email inmediato.

Estados de entrega (`sent → delivered → read`) llegan al mismo webhook en `statuses[]`.
