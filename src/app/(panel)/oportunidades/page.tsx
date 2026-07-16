import { getOpportunities, getOpportunitiesForUser } from "@/lib/opportunities";
import { getCustomers, getCustomersForUser } from "@/lib/customers";
import { isSupabaseConfigured } from "@/lib/db";
import { getServerUserId } from "@/lib/api-auth";
import { KanbanBoard } from "@/components/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function OportunidadesPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;
  const [{ opportunities }, { customers }] = await Promise.all([
    scoped ? getOpportunitiesForUser(userId) : getOpportunities(),
    scoped ? getCustomersForUser(userId) : getCustomers(),
  ]);

  const contacts = customers
    .map((c) => ({ id: c.contact.id, name: c.contact.name ?? c.contact.phone ?? "Sin nombre" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Oportunidades</h1>
        <p className="text-violet-300/70 mt-1">
          Tu pipeline de ventas. Arrastra las tarjetas para cambiar de etapa.
        </p>
      </div>
      <KanbanBoard
        initialOpportunities={opportunities}
        contacts={contacts}
        demo={!isSupabaseConfigured()}
      />
    </div>
  );
}
