import { getConversations } from "@/lib/db";
import { ConversationsList } from "@/components/ConversationsList";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const items = await getConversations();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">
          Conversaciones
        </h1>
        <p className="text-violet-300/70 mt-1">
          {items.length} contactos · {items.filter((c) => c.lead?.score === "hot").length} leads hot
        </p>
      </div>
      <ConversationsList items={items} />
    </div>
  );
}
