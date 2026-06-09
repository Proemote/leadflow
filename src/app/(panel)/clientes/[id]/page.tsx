import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/customers";
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
  const data = await getCustomer(id);
  if (!data) notFound();
  const metrics = computeCustomerMetrics(data.contact, data.operations);

  return (
    <CustomerDetail
      contact={data.contact}
      operations={data.operations}
      metrics={metrics}
      demo={!isSupabaseConfigured()}
    />
  );
}
