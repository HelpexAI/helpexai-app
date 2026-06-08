import { ActiveConversationClientPage } from "@/components/conversations/active-conversation-client-page";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ActiveConversationClientPage id={id} />;
}
