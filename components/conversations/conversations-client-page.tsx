"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { SectionLoading } from "@/components/dashboard/section-loading";
import { ConversationHub } from "@/components/conversations/conversation-hub";
import { ConversationsLocked } from "@/components/conversations/conversations-locked";
import type { ConversationSummary } from "@/components/conversations/conversation-sidebar";
import type { CategorySlug, Document } from "@/types";
import { useCallback, useEffect, useState } from "react";

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
  const [data, setData] = useState<ConversationsResponse | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      const result = await response.json() as ConversationsResponse;
      if (!response.ok) throw new Error(result.error ?? "Could not load conversations.");
      setData(result);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load conversations.");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (error) return <ClientPageError message={error} onRetry={() => void load()} />;
  if (!data) return <SectionLoading label="Loading conversations..." />;
  if (data.locked) return <ConversationsLocked used={data.used ?? 0} limit={data.limit ?? 0} />;
  return <ConversationHub conversations={data.conversations ?? []} documents={data.documents ?? []} category={data.category ?? "legal"} />;
}
