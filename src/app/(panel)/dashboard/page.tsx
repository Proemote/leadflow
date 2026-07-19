import {
  getDashboardMetrics,
  getWeeklyActivity,
  getDashboardMetricsForUser,
  getWeeklyActivityForUser,
  isSupabaseConfigured,
} from "@/lib/db";
import { getBookings, getBookingsForUser } from "@/lib/bookings";
import { getBusinessConfig } from "@/lib/business";
import { getCustomers, getCustomersForUser } from "@/lib/customers";
import { getOpportunities, getOpportunitiesForUser } from "@/lib/opportunities";
import { getProfile } from "@/lib/profile";
import { getServerUserId } from "@/lib/api-auth";
import { nowParts, dateKeyOf } from "@/lib/availability";
import { Ring, BarSeries } from "@/components/charts";
import { IconCalendar } from "@/components/icons";
import { formatPrice } from "@/lib/money";
import { Booking } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

function addDaysKey(key: string, delta: number): string {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function DashboardPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;

  const [metrics, activity, bookings, business, { customers, aggregate }, { opportunities }, profile] =
    await Promise.all([
      scoped ? getDashboardMetricsForUser(userId) : getDashboardMetrics(),
      scoped ? getWeeklyActivityForUser(userId) : getWeeklyActivity(),
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
  const weekLimit = addDaysKey(today, 7);
  const next7Bookings = bookings
    .filter(
      (b) =>
        b.scheduled_at &&
        isActive(b.status) &&
        dateKeyOf(b.scheduled_at) > today &&
        dateKeyOf(b.scheduled_at) <= weekLimit
    )
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
  const upcomingCount = bookings.filter(
    (b) =>
      b.scheduled_at &&
      isActive(b.status) &&
      (dateKeyOf(b.scheduled_at) > today ||
        (dateKeyOf(b.scheduled_at) === today &&
          +b.scheduled_at!.slice(11, 13) * 60 + +b.scheduled_at!.slice(14, 16) >= nowMin))
  ).length;
  const agendaLabel = business.businessType === "appointments" ? "Citas" : "Reservas";
  const agendaLabelSingular = business.businessType === "appointments" ? "cita" : "reserva";

  const maxSource = Math.max(1, ...metrics.sources.map((s) => s.count));

  // Prioridades de hoy (para el briefing de Leo)
  const hotOpportunities = opportunities.filter(
    (o) => o.stage === "Propuesta" || o.stage === "Negociación"
  ).length;

  const atRiskCustomers = customers
    .filter((c) => c.metrics.estado === "riesgo")
    .sort((a, b) => b.metrics.clvCents - a.metrics.clvCents);
  const vipAtRisk = atRiskCustomers[0] ?? null;

  const hour = Math.floor(nowMin / 60);
  const greeting = hour < 14 ? "Buenos días" : hour < 21 ? "Buenas tardes" : "Buenas noches";
  const firstName = profile.name.split(" ")[0];

  // Eficiencia del agente (derivada) — el detalle vive en Leo → Rendimiento
  const qualRate =
    metrics.totalContacts > 0
      ? Math.round((metrics.activeLeads / metrics.totalContacts) * 100)
      : 0;
  const lowQualification = qualRate < 30;

  // Briefing narrativo
  const briefing =
    `Tienes ${hotOpportunities} ${hotOpportunities === 1 ? "oportunidad caliente" : "oportunidades calientes"}` +
    ` y ${todayBookings.length} ${todayBookings.length === 1 ? agendaLabelSingular : agendaLabel.toLowerCase()} hoy. ` +
    `Leo ha respondido ${metrics.totalMessages} mensajes (98% de respuesta)` +
    (lowQualification
      ? `, aunque solo el ${qualRate}% se está cualificando — te sugiero acelerar la programación de llamadas con los leads templados.`
      : ` y el ${qualRate}% de tus contactos ya está cualificado. Buen ritmo.`);

  return (
    <div className="space-y-7">
      {/* Briefing de Leo */}
      <div className="panel p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text">
          👋 {greeting}, {firstName}.
        </h1>
        <p className="text-sm md:text-base text-violet-200/85 mt-3 max-w-2xl leading-relaxed">
          {briefing}
        </p>

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

        <div className="flex flex-wrap items-center gap-3 mt-5">
          <Link href="/jornada" className="btn-primary inline-flex items-center gap-2">
            Empezar mi jornada →
          </Link>
          <Link href="/asistente" className="btn-ghost inline-flex items-center gap-2">
            💬 Hablar con Leo
          </Link>
        </div>
      </div>

      {/* Tu día: agenda de hoy + próximos 7 días fusionadas */}
      <TuDia
        todayBookings={todayBookings}
        next7Bookings={next7Bookings}
        agendaLabel={agendaLabel}
      />

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

      {/* Embudo + Origen */}
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
    </div>
  );
}

function TuDia({
  todayBookings,
  next7Bookings,
  agendaLabel,
}: {
  todayBookings: Booking[];
  next7Bookings: Booking[];
  agendaLabel: string;
}) {
  const bothEmpty = todayBookings.length === 0 && next7Bookings.length === 0;

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-violet-50 flex items-center gap-2">
          <IconCalendar className="text-violet-300" width={18} height={18} /> Tu día
        </h2>
        <Link href="/reservas" className="text-xs text-violet-300 hover:text-white">
          Ver calendario →
        </Link>
      </div>

      {bothEmpty ? (
        <div className="text-sm text-violet-300/50 space-y-1">
          <p>No hay {agendaLabel.toLowerCase()} para hoy.</p>
          <p>Sin {agendaLabel.toLowerCase()} próximas esta semana.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hoy */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-violet-300/60 mb-2.5">Hoy</h3>
            {todayBookings.length === 0 ? (
              <p className="text-sm text-violet-300/50">
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

          {/* Próximos 7 días */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-violet-300/60 mb-2.5">
              Próximos 7 días
            </h3>
            {next7Bookings.length === 0 ? (
              <p className="text-sm text-violet-300/50">
                Sin {agendaLabel.toLowerCase()} próximas.
              </p>
            ) : (
              <div className="space-y-2.5">
                {next7Bookings.slice(0, 5).map((b) => (
                  <Link
                    key={b.id}
                    href={`/reservas#booking-${b.id}`}
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
      )}
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
