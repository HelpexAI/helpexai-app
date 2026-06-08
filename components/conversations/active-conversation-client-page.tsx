"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { ActiveConversation } from "@/components/conversations/active-conversation";
import { ConversationsLocked } from "@/components/conversations/conversations-locked";
import { ConversationSkeleton } from "@/components/conversations/conversation-skeleton";
import type { ConversationSummary } from "@/components/conversations/conversation-sidebar";
import type { CategorySlug, Message } from "@/types";
import { fetchJson, queryKeys } from "@/lib/client/query";
import { useQuery } from "@tanstack/react-query";

type ActiveConversationResponse = {
  error?: string;
  locked: boolean;
  used?: number;
  limit?: number;
  conversation?: ConversationSummary;
  conversations?: ConversationSummary[];
  documents?: Array<{ id: string; name: string }>;
  messages?: Message[];
  category?: CategorySlug;
  questionsUsed?: number;
  questionsLimit?: number;
};

export function ActiveConversationClientPage({ id }: { id: string }) {
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => fetchJson<ActiveConversationResponse>(`/api/conversations/${id}`),
  });
  if (error) return <ClientPageError message={error.message} onRetry={() => void refetch()} />;
  if (!data) return <ConversationSkeleton />;
  if (data.locked) return <ConversationsLocked used={data.used ?? 0} limit={data.limit ?? 0} />;
  if (!data.conversation || !data.category) return <ClientPageError message="Conversation data is unavailable." onRetry={() => void refetch()} />;
  return <ActiveConversation conversation={data.conversation} conversations={data.conversations ?? []} documents={data.documents ?? []} initialMessages={data.messages ?? []} category={data.category} questionsUsed={data.questionsUsed ?? 0} questionsLimit={data.questionsLimit ?? 0} />;
}
