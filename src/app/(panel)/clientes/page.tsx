import { getCustomers, getCustomersForUser } from "@/lib/customers";
import { isSupabaseConfigured } from "@/lib/db";
import { getServerUserId } from "@/lib/api-auth";
import { ClientesList } from "@/components/ClientesList";

export const dynamic = "force-dynamic";

export default async function ContactosPage() {
  const userId = await getServerUserId();
  const { customers, aggregate } =
    isSupabaseConfigured() && userId ? await getCustomersForUser(userId) : await getCustomers();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Contactos</h1>
        <p className="text-violet-300/70 mt-1">
          Tu cartera de contactos con su valor (CLV), etapa del customer journey y actividad.
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
