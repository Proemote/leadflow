import { notFound } from "next/navigation";
import { getConversation, isSupabaseConfigured } from "@/lib/db";
import { ConversationView } from "@/components/ConversationView";

export const dynamic = "force-dynamic";

export default async function ConversationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getConversation(id);
  if (!data) notFound();

  return (
    <ConversationView
      contact={data.contact}
      messages={data.messages}
      lead={data.lead}
      demo={!isSupabaseConfigured()}
    />
  );
}
