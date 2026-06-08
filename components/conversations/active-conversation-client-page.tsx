"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { ActiveConversation } from "@/components/conversations/active-conversation";
import { ConversationsLocked } from "@/components/conversations/conversations-locked";
import { ConversationSkeleton } from "@/components/conversations/conversation-skeleton";
import type { ConversationSummary } from "@/components/conversations/conversation-sidebar";
import type { CategorySlug, Message } from "@/types";
import { conversationCacheKeys, getConversationCache, setConversationCache } from "@/lib/client/conversation-cache";
import { useCallback, useEffect, useState } from "react";

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
  const cacheKey = conversationCacheKeys.detail(id);
  const [data, setData] = useState<ActiveConversationResponse | null>(() => getConversationCache(cacheKey));
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      const result = await response.json() as ActiveConversationResponse;
      if (!response.ok) throw new Error(result.error ?? "Could not load conversation.");
      setData(result);
      setConversationCache(cacheKey, result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load conversation.");
    }
  }, [cacheKey, id]);
  useEffect(() => {
    if (!data) void load();
  }, [data, load]);
  if (error) return <ClientPageError message={error} onRetry={() => void load()} />;
  if (!data) return <ConversationSkeleton />;
  if (data.locked) return <ConversationsLocked used={data.used ?? 0} limit={data.limit ?? 0} />;
  if (!data.conversation || !data.category) return <ClientPageError message="Conversation data is unavailable." onRetry={() => void load()} />;
  return <ActiveConversation conversation={data.conversation} conversations={data.conversations ?? []} documents={data.documents ?? []} initialMessages={data.messages ?? []} category={data.category} questionsUsed={data.questionsUsed ?? 0} questionsLimit={data.questionsLimit ?? 0} />;
}
