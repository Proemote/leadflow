import { getConversations, getConversationsForUser, isSupabaseConfigured } from "@/lib/db";
import { getCustomers, getCustomersForUser } from "@/lib/customers";
import { getServerUserId } from "@/lib/api-auth";
import { ConversationsList } from "@/components/ConversationsList";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const userId = await getServerUserId();
  const scoped = isSupabaseConfigured() && userId;
  const [items, { customers }] = await Promise.all([
    scoped ? getConversationsForUser(userId) : getConversations(),
    scoped ? getCustomersForUser(userId) : getCustomers(),
  ]);
  const allContacts = customers
    .map((c) => ({ id: c.contact.id, name: c.contact.name ?? c.contact.phone ?? "Sin nombre", phone: c.contact.phone }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Conversaciones
        </h1>
        <p className="text-violet-300/70 mt-1">
          {items.length} conversaciones activas · {items.filter((c) => c.lead?.score === "hot").length} leads hot
        </p>
      </div>
      <ConversationsList items={items} allContacts={allContacts} />
    </div>
  );
}
