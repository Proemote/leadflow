import Link from "next/link";
import {
  getConversations,
  getConversationsForUser,
  isSupabaseConfigured,
} from "@/lib/db";
import { getBookings, getBookingsForUser } from "@/lib/bookings";
import { getOpportunities, getOpportunitiesForUser } from "@/lib/opportunities";
import { getBusinessConfig } from "@/lib/business";
import { getProfile } from "@/lib/profile";
import { getServerUserId } from "@/lib/api-auth";
import { getJornadaCompletadosForUser } from "@/lib/jornada";
import { nowParts, dateKeyOf } from "@/lib/availability";
import { formatPrice } from "@/lib/money";
import { JornadaChecklist, JornadaGroup } from "@/components/JornadaChecklist";

export const dynamic = "force-dynamic";

// Umbral de "cerca de cerrar": oportunidades en Propuesta/Negociación con
// fecha de cierre estimada dentro de los próximos 7 días (o ya vencida).
const CLOSE_WINDOW_DAYS = 7;

function addDaysKey(key: string, delta: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Plan del día de Leo. Esta página NO está en el sidebar a propósito:
 * es un ritual de inicio de jornada al que solo se llega desde el botón
 * "Empezar mi jornada" de la card de briefing del Panel.
 */
export default async function JornadaPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;

  const [conversations, bookings, { opportunities }, business, profile] =
    await Promise.all([
      scoped ? getConversationsForUser(userId) : getConversations(),
      scoped ? getBookingsForUser(userId) : getBookings(),
      scoped ? getOpportunitiesForUser(userId) : getOpportunities(),
      getBusinessConfig(),
      getProfile(),
    ]);

  const { dateKey: today } = nowParts();
  const completed = scoped
    ? await getJornadaCompletadosForUser(userId, today)
    : [];

  // 🔥 Leads calientes con último mensaje del cliente sin responder
  const hotUnanswered = conversations.filter(
    (c) => c.lead?.score === "hot" && c.lastMessage?.role === "user"
  );

  // 📅 Citas de hoy (mismo criterio que el widget "Tu día" del Panel)
  const isActive = (s: string) => s === "pending" || s === "confirmed";
  const todayBookings = bookings
    .filter((b) => b.scheduled_at && dateKeyOf(b.scheduled_at) === today && isActive(b.status))
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));

  // 💼 Oportunidades en Propuesta/Negociación con cierre próximo o vencido
  const closeLimit = addDaysKey(today, CLOSE_WINDOW_DAYS);
  const closingSoon = opportunities
    .filter(
      (o) =>
        (o.stage === "Propuesta" || o.stage === "Negociación") &&
        o.expected_close &&
        o.expected_close.slice(0, 10) <= closeLimit
    )
    .sort((a, b) => (a.expected_close ?? "").localeCompare(b.expected_close ?? ""));

  // 💡 Sugerencia de Leo desglosada: un ítem por lead templado
  const warmLeads = conversations.filter((c) => c.lead?.score === "warm");

  const agendaLabel = business.businessType === "appointments" ? "cita" : "reserva";

  const groups: JornadaGroup[] = [
    {
      emoji: "🔥",
      title: "Leads calientes sin responder",
      emptyLabel: "Ningún lead caliente esperando respuesta. 👌",
      items: hotUnanswered.map((c) => ({
        itemKey: `lead_caliente:${c.contact.id}`,
        title: `Responder a ${c.contact.name ?? c.contact.phone ?? "contacto"}`,
        subtitle: c.lastMessage?.content ?? undefined,
        href: `/conversations/${c.contact.id}`,
        hrefLabel: "Abrir conversación",
      })),
    },
    {
      emoji: "📅",
      title: "Citas de hoy",
      emptyLabel: "No hay citas en la agenda de hoy.",
      items: todayBookings.map((b) => ({
        itemKey: `cita:${b.id}`,
        title: `${b.scheduled_at?.slice(11, 16)} · ${b.customer_name}`,
        subtitle: b.service_name ?? b.notes ?? undefined,
        href: `/reservas#booking-${b.id}`,
        hrefLabel: `Ver ${agendaLabel}`,
      })),
    },
    {
      emoji: "💼",
      title: "Oportunidades cerca de cerrar",
      emptyLabel: `Sin cierres previstos en los próximos ${CLOSE_WINDOW_DAYS} días.`,
      items: closingSoon.map((o) => ({
        itemKey: `oportunidad:${o.id}`,
        title: `${o.title}${o.contact_name ? ` · ${o.contact_name}` : ""}`,
        subtitle: `${o.stage} · ${formatPrice(o.value_cents)} · cierre ${new Date(`${o.expected_close!.slice(0, 10)}T12:00:00`).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`,
        href: `/oportunidades#opp-${o.id}`,
        hrefLabel: "Ver en pipeline",
      })),
    },
    {
      emoji: "💡",
      title: "Sugerencias de Leo",
      emptyLabel: "Leo no tiene seguimientos pendientes que sugerirte hoy.",
      items: warmLeads.map((c) => ({
        itemKey: `sugerencia:${c.contact.id}`,
        title: `Contactar a ${c.contact.name ?? c.contact.phone ?? "contacto"}: acelerar la programación de una llamada`,
        subtitle: c.lead?.reason || undefined,
        href: `/conversations/${c.contact.id}`,
        hrefLabel: "Abrir conversación",
      })),
    },
  ];

  const todayLabel = new Date(`${today}T12:00:00`).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Link href="/dashboard" className="text-xs text-violet-300 hover:text-white">
          ← Volver al panel
        </Link>
        <h1 className="text-3xl font-bold tracking-tight gradient-text mt-2">
          Tu jornada de hoy
        </h1>
        <p className="text-violet-300/70 mt-1">
          <span className="capitalize">{todayLabel}</span> · el plan de acción que Leo
          ha preparado para {profile.name.split(" ")[0]}.
        </p>
      </div>

      <JornadaChecklist
        groups={groups}
        fecha={today}
        initialCompleted={completed}
        demo={!scoped}
      />
    </div>
  );
}
