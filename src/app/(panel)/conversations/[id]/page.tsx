import { notFound } from "next/navigation";
import { getConversation, getConversationForUser, isSupabaseConfigured } from "@/lib/db";
import { getServerUserId } from "@/lib/api-auth";
import { ConversationView } from "@/components/ConversationView";

export const dynamic = "force-dynamic";

export default async function ConversationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await getServerUserId();
  const data =
    isSupabaseConfigured() && userId ? await getConversationForUser(userId, id) : await getConversation(id);
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
