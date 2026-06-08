import { ActiveConversation } from "@/components/conversations/active-conversation";
import { ConversationsLocked } from "@/components/conversations/conversations-locked";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { createClient } from "@/lib/supabase/server";
import { startOfTodayUtc } from "@/lib/usage/daily";
import type { Message } from "@/types";
import { notFound } from "next/navigation";
import { PLAN_LIMITS } from "@/lib/stripe/plans";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workspace = await getCurrentWorkspace();
  if (workspace.documentsOverLimit) {
    return <ConversationsLocked used={workspace.documentsUsed} limit={workspace.documentsLimit} />;
  }
  const supabase = await createClient();
  const [{ data: conversation }, { data: conversations }, { data: messages }, { count: questionsUsed }] = await Promise.all([
    supabase.from("conversations").select("id, title, selected_document_ids, updated_at").eq("id", id).eq("user_id", workspace.userId).eq("category_slug", workspace.category).maybeSingle(),
    supabase.from("conversations").select("id, title, selected_document_ids, updated_at").eq("user_id", workspace.userId).eq("category_slug", workspace.category).order("updated_at", { ascending: false }),
    supabase.from("messages").select("*").eq("conversation_id", id).order("created_at", { ascending: true }),
    supabase.from("usage_logs").select("*", { count: "exact", head: true }).eq("user_id", workspace.userId).eq("category_slug", workspace.category).eq("action", "query").gte("created_at", startOfTodayUtc()),
  ]);
  if (!conversation) notFound();
  const { data: documents } = await supabase.from("documents").select("id, name").eq("user_id", workspace.userId).eq("category_slug", workspace.category).in("id", conversation.selected_document_ids);
  return <ActiveConversation conversation={conversation} conversations={conversations ?? []} documents={documents ?? []} initialMessages={(messages ?? []) as Message[]} category={workspace.category} questionsUsed={questionsUsed ?? 0} questionsLimit={PLAN_LIMITS[workspace.plan].max_queries_day} />;
}
