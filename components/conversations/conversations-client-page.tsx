"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { ConversationHub } from "@/components/conversations/conversation-hub";
import { ConversationsLocked } from "@/components/conversations/conversations-locked";
import { ConversationSkeleton } from "@/components/conversations/conversation-skeleton";
import type { ConversationSummary } from "@/components/conversations/conversation-sidebar";
import type { CategorySlug, Document } from "@/types";
import { fetchJson, queryKeys } from "@/lib/client/query";
import { useQuery } from "@tanstack/react-query";

type ConversationsResponse = {
  error?: string;
  locked: boolean;
  used?: number;
  limit?: number;
  conversations?: ConversationSummary[];
  documents?: Pick<Document, "id" | "name" | "file_size" | "file_type">[];
  category?: CategorySlug;
};

export function ConversationsClientPage() {
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: () => fetchJson<ConversationsResponse>("/api/conversations"),
  });
  if (error) return <ClientPageError message={error.message} onRetry={() => void refetch()} />;
  if (!data) return <ConversationSkeleton root />;
  if (data.locked) return <ConversationsLocked used={data.used ?? 0} limit={data.limit ?? 0} />;
  return <ConversationHub conversations={data.conversations ?? []} documents={data.documents ?? []} category={data.category ?? "business"} />;
}
