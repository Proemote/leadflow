import { getBookings } from "@/lib/bookings";
import { getServices } from "@/lib/services";
import { getBusinessConfig } from "@/lib/business";
import { isSupabaseConfigured } from "@/lib/db";
import { BookingsManager } from "@/components/BookingsManager";

export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const [bookings, services, config] = await Promise.all([
    getBookings(),
    getServices(true),
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
