import {
  getDashboardMetrics,
  getWeeklyActivity,
  getConversations,
  getDashboardMetricsForUser,
  getWeeklyActivityForUser,
  getConversationsForUser,
  isSupabaseConfigured,
} from "@/lib/db";
import { getBookings, getBookingsForUser } from "@/lib/bookings";
import { getBusinessConfig } from "@/lib/business";
import { getCustomers, getCustomersForUser } from "@/lib/customers";
import { getOpportunities, getOpportunitiesForUser } from "@/lib/opportunities";
import { getProfile } from "@/lib/profile";
import { getServerUserId } from "@/lib/api-auth";
import { nowParts, dateKeyOf } from "@/lib/availability";
import { Donut, Ring, BarSeries, Meter } from "@/components/charts";
import { IconBolt, IconCalendar } from "@/components/icons";
import { scoreLabel } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;

  const [metrics, activity, conversations, bookings, business, { customers, aggregate }, { opportunities }, profile] =
    await Promise.all([
      scoped ? getDashboardMetricsForUser(userId) : getDashboardMetrics(),
      scoped ? getWeeklyActivityForUser(userId) : getWeeklyActivity(),
      scoped ? getConversationsForUser(userId) : getConversations(),
      scoped ? getBookingsForUser(userId) : getBookings(),
      getBusinessConfig(),
      scoped ? getCustomersForUser(userId) : getCustomers(),
      scoped ? getOpportunitiesForUser(userId) : getOpportunities(),
      getProfile(),
    ]);

  // Agenda
  const { dateKey: today, minutes: nowMin } = nowParts();
  const isActive = (s: string) => s === "pending" || s === "confirmed";
  const todayBookings = bookings
    .filter((b) => b.scheduled_at && dateKeyOf(b.scheduled_at) === today && isActive(b.status))
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const upcomingBookings = bookings
    .filter(
      (b) =>
        b.scheduled_at &&
        isActive(b.status) &&
        (dateKeyOf(b.scheduled_at) > today ||
          (dateKeyOf(b.scheduled_at) === today &&
            +b.scheduled_at!.slice(11, 13) * 60 + +b.scheduled_at!.slice(14, 16) >= nowMin))
    )
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const upcomingCount = upcomingBookings.length;
  const agendaLabel = business.businessType === "appointments" ? "Citas" : "Reservas";
  const agendaLabelSingular = business.businessType === "appointments" ? "cita" : "reserva";

  const hotLeads = conversations
    .filter((c) => c.lead?.score === "hot" || c.lead?.score === "warm")
    .sort((a, b) => (a.lead!.score === "hot" ? -1 : 1))
    .slice(0, 4);

  const maxSource = Math.max(1, ...metrics.sources.map((s) => s.count));

  // Prioridades de hoy (para el saludo de Leo)
  const hotOpportunities = opportunities.filter(
    (o) => o.stage === "Propuesta" || o.stage === "Negociación"
  ).length;
  const pendingConversations = conversations.filter(
    (c) => c.lastMessage?.role === "user"
  ).length;
  const atRiskCustomers = customers
    .filter((c) => c.metrics.estado === "riesgo")
    .sort((a, b) => b.metrics.clvCents - a.metrics.clvCents);
  const vipAtRisk = atRiskCustomers[0] ?? null;

  const hour = Math.floor(nowMin / 60);
  const greeting = hour < 14 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile.name.split(" ")[0];

  // Eficiencia del agente (derivada)
  const qualified = metrics.activeLeads;
  const qualRate =
    metrics.totalContacts > 0
      ? Math.round((qualified / metrics.totalContacts) * 100)
      : 0;
  const hotRate = metrics.hotPct;

  const nothingUrgent = hotOpportunities === 0 && pendingConversations === 0 && upcomingCount === 0 && !vipAtRisk;

  return (
    <div className="space-y-7">
      {/* Saludo de Leo */}
      <div className="panel p-6 md:p-8">
        <p className="text-sm text-violet-300/70">👋 {greeting}, {firstName}.</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text mt-1">
          Hoy he analizado toda tu actividad.
        </h1>

        <div className="flex flex-wrap gap-2.5 mt-5">
          {hotOpportunities > 0 && (
            <span className="chip chip-hot">
              🔴 {hotOpportunities} oportunidad{hotOpportunities === 1 ? "" : "es"} caliente{hotOpportunities === 1 ? "" : "s"}
            </span>
          )}
          {pendingConversations > 0 && (
            <span className="chip chip-warm">
              🟡 {pendingConversations} conversaci{pendingConversations === 1 ? "ón" : "ones"} pendiente{pendingConversations === 1 ? "" : "s"}
            </span>
          )}
          {upcomingCount > 0 && (
            <span className="chip chip-cold">
              🔵 {upcomingCount} {upcomingCount === 1 ? agendaLabelSingular : agendaLabel.toLowerCase()} próxima{upcomingCount === 1 ? "" : "s"}
            </span>
          )}
          {nothingUrgent && <span className="chip">✅ Todo al día, sin pendientes urgentes</span>}
        </div>

        {vipAtRisk && (
          <div className="mt-4 panel-tight px-4 py-3 flex items-start gap-2.5 text-sm text-violet-100">
            <span className="shrink-0">⚠️</span>
            <p>
              He detectado un cliente en riesgo de perderse:{" "}
              <strong className="text-violet-50">
                {vipAtRisk.contact.name ?? vipAtRisk.contact.phone}
              </strong>{" "}
              lleva {vipAtRisk.metrics.recenciaDias} días sin actividad.
            </p>
          </div>
        )}

        <Link href="#leads-por-contactar" className="btn-primary inline-flex items-center gap-2 mt-5">
          Empezar mi jornada →
        </Link>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <QuickAction href="/clientes?new=1" emoji="👤" label="Nuevo contacto" />
        <QuickAction href="/oportunidades?new=1" emoji="💼" label="Nueva oportunidad" />
        <QuickAction
          href="/reservas?new=1"
          emoji="📅"
          label={`Nueva ${agendaLabelSingular}`}
        />
        <QuickAction href="/servicios?new=1" emoji="🛠️" label="Añadir servicio" />
        <QuickAction href="/clientes?import=1" emoji="📥" label="Importar contactos" />
      </div>

      {/* Salud de la cartera */}
      <div className="panel p-6">
        <h2 className="text-lg font-semibold text-violet-50 mb-4">Salud de la cartera</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
          <PortfolioStat
            label="Ingresos totales"
            value={aggregate.clientesConCompra > 0 ? formatPrice(aggregate.ingresosTotalesCents) : "—"}
          />
          <PortfolioStat
            label="CLV medio"
            value={aggregate.clientesConCompra > 0 ? formatPrice(aggregate.clvMedioCents) : "—"}
          />
          <PortfolioStat
            label="% recurrentes"
            value={aggregate.clientesConCompra > 0 ? `${Math.round(aggregate.pctRecurrentes * 100)}%` : "—"}
          />
        </div>
      </div>

      {/* Fila superior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad */}
        <div className="panel p-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-violet-50">
                Estado del embudo
              </h2>
              <p className="text-xs text-violet-300/60 mt-0.5">
                Actividad de los últimos 30 días
              </p>
            </div>
            <div className="flex gap-8 text-right">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-violet-300/60">
                  Leads activos
                </div>
                <div className="text-2xl font-bold text-violet-50">
                  {metrics.activeLeads}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-violet-300/60">
                  Contactos
                </div>
                <div className="text-2xl font-bold text-violet-50">
                  {metrics.totalContacts}
                </div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider text-violet-300/60">
                  {agendaLabel} próximas
                </div>
                <div className="text-2xl font-bold text-violet-50">{upcomingCount}</div>
              </div>
            </div>
          </div>
          <div className="h-[230px] mt-2">
            <BarSeries data={activity} />
          </div>
        </div>

        {/* Fuentes */}
        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-violet-50 mb-5">
            Origen de los leads
          </h2>
          <div className="space-y-4">
            {metrics.sources.slice(0, 5).map((s) => (
              <Ring key={s.label} value={s.count} max={maxSource} label={s.label} />
            ))}
            {metrics.sources.length === 0 && (
              <p className="text-sm text-violet-300/50">Sin datos todavía.</p>
            )}
          </div>
        </div>
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calidad de leads (donut) */}
        <div className="panel p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold text-violet-50 self-start mb-4">
            Calidad de los leads
          </h2>
          <Donut value={metrics.hotPct} label={`${metrics.hotPct}%`} sublabel="Calientes" />
          <div className="flex gap-3 mt-5 text-xs">
            <span className="chip chip-hot">🔥 {metrics.hot} calientes</span>
            <span className="chip chip-warm">🌤️ {metrics.warm} templados</span>
            <span className="chip chip-cold">❄️ {metrics.cold} fríos</span>
          </div>
        </div>

        {/* Leads calientes */}
        <div id="leads-por-contactar" className="panel p-6 scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-violet-50">
              Leads por contactar
            </h2>
            <Link href="/conversations" className="text-xs text-violet-300 hover:text-white">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {hotLeads.map((c) => (
              <Link
                key={c.contact.id}
                href={`/conversations/${c.contact.id}`}
                className="flex items-center gap-3 panel-tight px-3 py-2.5 hover:border-violet-500/40 transition"
              >
                <div
                  className="size-9 rounded-full grid place-items-center text-xs font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(140deg,#8b5cf6,#6d28d9)" }}
                >
                  {(c.contact.name ?? c.contact.phone ?? "?").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-violet-50 truncate">
                    {c.contact.name ?? c.contact.phone}
                  </div>
                  <div className="text-[11px] text-violet-300/60 truncate">
                    {c.lastMessage?.content ?? "—"}
                  </div>
                </div>
                <span className={`chip chip-${c.lead!.score}`}>
                  {scoreLabel(c.lead!.score)}
                </span>
              </Link>
            ))}
            {hotLeads.length === 0 && (
              <p className="text-sm text-violet-300/50">
                Todavía no hay leads cualificados.
              </p>
            )}
          </div>
        </div>

        {/* Eficiencia del agente */}
        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-violet-50 mb-5">
            Eficiencia de Leo
          </h2>
          <div className="space-y-5">
            <Meter label="Tasa de respuesta" value={98} />
            <Meter label="Tasa de cualificación" value={qualRate} />
            <Meter label="Conversión a caliente" value={hotRate} />
          </div>
          <div className="mt-6 panel-tight p-3 flex gap-2.5 text-xs text-violet-200/80">
            <IconBolt className="text-fuchsia-300 shrink-0" width={16} height={16} />
            <p>
              Leo ha respondido <strong className="text-violet-100">{metrics.totalMessages}</strong>{" "}
              mensajes. Enfoque sugerido: acelerar la programación de llamadas con los leads templados.
            </p>
          </div>
        </div>
      </div>

      {/* Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agenda de hoy */}
        <div className="panel p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-violet-50 flex items-center gap-2">
              <IconCalendar className="text-violet-300" width={18} height={18} /> Agenda de hoy
            </h2>
            <Link href="/reservas" className="text-xs text-violet-300 hover:text-white">
              Ver calendario →
            </Link>
          </div>
          {todayBookings.length === 0 ? (
            <p className="text-sm text-violet-300/50 py-6 text-center">
              No hay {agendaLabel.toLowerCase()} para hoy.
            </p>
          ) : (
            <div className="space-y-2">
              {todayBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 panel-tight px-3 py-2.5">
                  <span className="font-mono text-violet-200 w-12 shrink-0">
                    {b.scheduled_at?.slice(11, 16)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-violet-50 truncate">{b.customer_name}</div>
                    <div className="text-[11px] text-violet-300/60 truncate">{b.service_name ?? b.notes ?? ""}</div>
                  </div>
                  <span className={`chip ${b.status === "confirmed" ? "chip-cold" : "chip-warm"}`}>
                    {b.status === "confirmed" ? "Confirmada" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas */}
        <div className="panel p-6">
          <h2 className="text-lg font-semibold text-violet-50 mb-4">Próximamente</h2>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-violet-300/50">Sin {agendaLabel.toLowerCase()} próximas.</p>
          ) : (
            <div className="space-y-2.5">
              {upcomingBookings.slice(0, 5).map((b) => (
                <Link
                  key={b.id}
                  href="/reservas"
                  className="flex items-center gap-2 text-sm hover:opacity-80 transition"
                >
                  <span className="size-1.5 rounded-full bg-violet-400 shrink-0" />
                  <span className="text-violet-300/70 w-28 shrink-0 capitalize">
                    {new Date(`${dateKeyOf(b.scheduled_at!)}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="font-mono text-violet-200 shrink-0">{b.scheduled_at?.slice(11, 16)}</span>
                  <span className="text-violet-50 truncate">{b.customer_name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, emoji, label }: { href: string; emoji: string; label: string }) {
  return (
    <Link
      href={href}
      className="panel-tight px-4 py-3.5 flex items-center gap-3 hover:border-violet-500/40 transition"
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <span className="text-sm font-medium text-violet-100">{label}</span>
    </Link>
  );
}

function PortfolioStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-violet-300/60">{label}</div>
      <div className="text-2xl font-bold text-violet-50 mt-0.5">{value}</div>
    </div>
  );
}
