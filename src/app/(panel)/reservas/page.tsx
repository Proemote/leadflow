import { getBookings, getBookingsForUser } from "@/lib/bookings";
import { getServices, getServicesForUser } from "@/lib/services";
import { getBusinessConfig } from "@/lib/business";
import { isSupabaseConfigured } from "@/lib/db";
import { getServerUserId } from "@/lib/api-auth";
import { BookingsManager } from "@/components/BookingsManager";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;
  const [bookings, services, config] = await Promise.all([
    scoped ? getBookingsForUser(userId) : getBookings(),
    scoped ? getServicesForUser(userId, true) : getServices(true),
    getBusinessConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          {config.businessType === "appointments" ? "Citas" : "Reservas y pedidos"}
        </h1>
        <p className="text-violet-300/70 mt-1">
          {config.businessType === "appointments"
            ? "Agenda citas con franjas horarias; las horas ocupadas se bloquean automáticamente."
            : "Gestiona reservas y pedidos con los datos básicos del cliente."}
        </p>
      </div>
      <BookingsManager
        initialBookings={bookings}
        services={services}
        config={config}
        demo={!isSupabaseConfigured()}
      />
    </div>
  );
}
