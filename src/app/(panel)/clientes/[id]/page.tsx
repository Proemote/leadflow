import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customers";
import { getServices } from "@/lib/services";
import { getBusinessConfig } from "@/lib/business";
import { computeCustomerMetrics } from "@/lib/metrics";
import { isSupabaseConfigured } from "@/lib/db";
import { CustomerDetail } from "@/components/CustomerDetail";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, services, businessConfig] = await Promise.all([
    getCustomer(id),
    getServices(true),
    getBusinessConfig(),
  ]);
  if (!data) notFound();
  const metrics = computeCustomerMetrics(data.contact, data.operations);

  return (
    <CustomerDetail
      contact={data.contact}
      operations={data.operations}
      opportunities={data.opportunities}
      bookings={data.bookings}
      contractedServices={data.contractedServices}
      services={services}
      businessConfig={businessConfig}
      metrics={metrics}
      demo={!isSupabaseConfigured()}
    />
  );
}
