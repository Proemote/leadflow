import { supabaseAdmin, isSupabaseConfigured } from "./supabase/admin";
import { Opportunity, PipelineStage, TERMINAL_STAGES } from "./types";
import { demoOpportunities } from "./demo";

export interface PipelineMetrics {
  valorTotalCents: number; // abiertas
  valorPonderadoCents: number; // abiertas * prob
  nAbiertas: number;
  ganadas: number;
  perdidas: number;
  tasaConversion: number | null; // ganadas / (ganadas+perdidas), null si no hay cierres
}

function isOpen(stage: string): boolean {
  return !TERMINAL_STAGES.includes(stage as PipelineStage);
}

export async function getOpportunities(): Promise<{
  opportunities: Opportunity[];
  metrics: PipelineMetrics;
}> {
  let opportunities: Opportunity[];

  if (!isSupabaseConfigured()) {
    opportunities = [...demoOpportunities];
  } else {
    const sb = supabaseAdmin();
    const { data } = await sb
      .from("opportunities")
      .select("*, contact:contacts(name)")
      .order("updated_at", { ascending: false });
    opportunities = ((data ?? []) as (Opportunity & { contact?: { name?: string } | null })[]).map(
      (o) => ({ ...o, contact_name: o.contact?.name ?? null })
    );
  }

  const open = opportunities.filter((o) => isOpen(o.stage));
  const ganadas = opportunities.filter((o) => o.stage === "Ganado").length;
  const perdidas = opportunities.filter((o) => o.stage === "Perdido").length;
  const cerradas = ganadas + perdidas;

  const metrics: PipelineMetrics = {
    valorTotalCents: open.reduce((s, o) => s + o.value_cents, 0),
    valorPonderadoCents: Math.round(
      open.reduce((s, o) => s + (o.value_cents * o.probability) / 100, 0)
    ),
    nAbiertas: open.length,
    ganadas,
    perdidas,
    tasaConversion: cerradas > 0 ? ganadas / cerradas : null,
  };

  return { opportunities, metrics };
}

export async function createOpportunity(input: {
  title: string;
  contact_id?: string | null;
  value_cents: number;
  probability: number;
  stage?: PipelineStage;
  expected_close?: string | null;
  owner?: string | null;
  last_activity?: string | null;
}): Promise<Opportunity> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("opportunities")
    .insert({
      title: input.title,
      contact_id: input.contact_id || null,
      value_cents: Math.max(0, Math.round(input.value_cents)),
      currency: "EUR",
      probability: Math.min(100, Math.max(0, Math.round(input.probability))),
      stage: input.stage ?? "Nuevo",
      expected_close: input.expected_close || null,
      owner: input.owner || null,
      last_activity: input.last_activity || null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Opportunity;
}

export async function updateOpportunity(
  id: string,
  patch: Partial<{
    title: string;
    contact_id: string | null;
    value_cents: number;
    probability: number;
    stage: PipelineStage;
    expected_close: string | null;
    owner: string | null;
    last_activity: string | null;
  }>
): Promise<{ opportunity: Opportunity; operationCreated: boolean }> {
  const sb = supabaseAdmin();

  // Estado previo (para detectar la transición a "Ganado")
  const { data: prev } = await sb
    .from("opportunities")
    .select("stage, contact_id, value_cents, title")
    .eq("id", id)
    .single();

  const { data, error } = await sb
    .from("opportunities")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  const opportunity = data as Opportunity;

  // ── Integración: al pasar a "Ganado" se genera una operación ──
  let operationCreated = false;
  const acabaDeGanar = patch.stage === "Ganado" && prev?.stage !== "Ganado";
  if (acabaDeGanar && opportunity.contact_id) {
    // Evitar duplicados: ¿ya hay una operación de esta oportunidad?
    const { data: existing } = await sb
      .from("operations")
      .select("id")
      .eq("opportunity_id", id)
      .maybeSingle();
    if (!existing) {
      await sb.from("operations").insert({
        contact_id: opportunity.contact_id,
        concept: opportunity.title,
        amount_cents: opportunity.value_cents,
        currency: "EUR",
        status: "completed",
        source: "opportunity",
        opportunity_id: id,
        date: new Date().toISOString(),
      });
      operationCreated = true;
    }
  }

  return { opportunity, operationCreated };
}

export async function deleteOpportunity(id: string): Promise<void> {
  const sb = supabaseAdmin();
  await sb.from("opportunities").delete().eq("id", id);
}
