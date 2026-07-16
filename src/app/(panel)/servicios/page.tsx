import { getServices, getServicesForUser } from "@/lib/services";
import { isSupabaseConfigured } from "@/lib/db";
import { getServerUserId } from "@/lib/api-auth";
import { ServicesManager } from "@/components/ServicesManager";

export const dynamic = "force-dynamic";

export default async function ServiciosPage() {
  const userId = await getServerUserId();
  const services =
    isSupabaseConfigured() && userId ? await getServicesForUser(userId) : await getServices();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Carta de servicios
        </h1>
        <p className="text-violet-300/70 mt-1">
          Tus servicios y precios. Leo los usa al hablar con clientes, así nunca inventa precios.
        </p>
      </div>
      <ServicesManager initial={services} demo={!isSupabaseConfigured()} />
    </div>
  );
}
