import { ConversationHub } from "@/components/conversations/conversation-hub";
import { ConversationsLocked } from "@/components/conversations/conversations-locked";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { createClient } from "@/lib/supabase/server";

export default async function ConversationsPage() {
  const workspace = await getCurrentWorkspace();
  if (workspace.documentsOverLimit) {
    return <ConversationsLocked used={workspace.documentsUsed} limit={workspace.documentsLimit} />;
  }
  const supabase = await createClient();
  const [{ data: conversations }, { data: documents }] = await Promise.all([
    supabase.from("conversations").select("id, title, selected_document_ids, updated_at").eq("user_id", workspace.userId).eq("category_slug", workspace.category).order("updated_at", { ascending: false }),
    supabase.from("documents").select("id, name, file_size, file_type").eq("user_id", workspace.userId).eq("category_slug", workspace.category).neq("status", "failed").order("created_at", { ascending: false }),
  ]);
  return <ConversationHub conversations={conversations ?? []} documents={documents ?? []} category={workspace.category} />;
}
