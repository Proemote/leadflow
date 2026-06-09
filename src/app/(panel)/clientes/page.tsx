import { getCustomers } from "@/lib/customers";
import { isSupabaseConfigured } from "@/lib/db";
import { ClientesList } from "@/components/ClientesList";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const { customers, aggregate } = await getCustomers();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Clientes</h1>
        <p className="text-violet-300/70 mt-1">
          Tu cartera de clientes con su valor (CLV), recurrencia y actividad.
        </p>
      </div>
      <ClientesList
        customers={customers}
        aggregate={aggregate}
        demo={!isSupabaseConfigured()}
      />
    </div>
  );
}
