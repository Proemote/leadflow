import Link from "next/link";
import {
  getSetting,
  getDashboardMetrics,
  getDashboardMetricsForUser,
  getConversations,
  getConversationsForUser,
  isSupabaseConfigured,
} from "@/lib/db";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/leo";
import { DEFAULT_INTERNAL_PROMPT, INTERNAL_PROMPT_KEY } from "@/lib/leo-internal";
import { getServerUserId } from "@/lib/api-auth";
import { SettingsForm } from "@/components/SettingsForm";
import { InternalAssistantForm } from "@/components/InternalAssistantForm";
import { LeoTabs } from "@/components/LeoTabs";
import { Donut, Meter } from "@/components/charts";
import { IconBolt } from "@/components/icons";
import { scoreLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;

  const [prompt, internalPrompt, metrics, conversations] = await Promise.all([
    getSetting("system_prompt", DEFAULT_SYSTEM_PROMPT),
    getSetting(INTERNAL_PROMPT_KEY, DEFAULT_INTERNAL_PROMPT),
    scoped ? getDashboardMetricsForUser(userId) : getDashboardMetrics(),
    scoped ? getConversationsForUser(userId) : getConversations(),
  ]);

  // Mismos cálculos que tenía el Panel antes de mover estas cards aquí
  const qualRate =
    metrics.totalContacts > 0
      ? Math.round((metrics.activeLeads / metrics.totalContacts) * 100)
      : 0;
  const hotLeads = conversations
    .filter((c) => c.lead?.score === "hot" || c.lead?.score === "warm")
    .sort((a, b) => (a.lead!.score === "hot" ? -1 : 1))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Leo</h1>
        <p className="text-violet-300/70 mt-1">
          Configura cómo responde tu agente de IA y revisa su rendimiento.
        </p>
      </div>

      <LeoTabs
        instrucciones={
          <SettingsForm
            initialPrompt={prompt || DEFAULT_SYSTEM_PROMPT}
            demo={!isSupabaseConfigured()}
          />
        }
        asistente={
          <InternalAssistantForm
            initialPrompt={internalPrompt || DEFAULT_INTERNAL_PROMPT}
            demo={!isSupabaseConfigured()}
          />
        }
        rendimiento={
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
            <div className="panel p-6">
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
                <Meter label="Conversión a caliente" value={metrics.hotPct} />
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
        }
      />
    </div>
  );
}
