import { getDocumentRequestContext } from "@/lib/documents/server";
import { RenameConversationSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";
import { startOfTodayUtc } from "@/lib/usage/daily";
import { PLAN_LIMITS } from "@/lib/stripe/plans";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { logEvent } from "@/lib/monitoring";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json({
      locked: true,
      used: context.documentLimit.used,
      limit: context.documentLimit.limit,
    });
  }

  const [{ data: conversations }, { data: messages }, { count: questionsUsed }, { data: availableDocuments }] = await Promise.all([
    context.service.from("conversations").select("id, title, selected_document_ids, external_research_enabled, updated_at").eq("user_id", context.user.id).eq("category_slug", context.category).order("updated_at", { ascending: false }),
    context.service.from("messages").select("id, conversation_id, role, content, sources, answer_type, tokens_used, created_at").eq("conversation_id", id).order("created_at", { ascending: true }),
    context.service.from("usage_logs").select("*", { count: "exact", head: true }).eq("user_id", context.user.id).eq("category_slug", context.category).eq("action", "query").gte("created_at", startOfTodayUtc()),
    context.service.from("documents").select("id, name").eq("user_id", context.user.id).eq("category_slug", context.category).eq("status", "ready"),
  ]);
  const conversation = conversations?.find(item => item.id === id);
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  const selectedIds = new Set(conversation.selected_document_ids);

  return NextResponse.json({
    locked: false,
    conversation,
    conversations: conversations ?? [],
    documents: (availableDocuments ?? []).filter(document => selectedIds.has(document.id)),
    availableDocuments: availableDocuments ?? [],
    messages: messages ?? [],
    category: context.category,
    questionsUsed: questionsUsed ?? 0,
    questionsLimit: PLAN_LIMITS[context.plan].max_queries_day,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = RenameConversationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { data, error } = await context.service
    .from("conversations")
    .update({ title: parsed.data.title.trim() })
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .select("id, title, selected_document_ids, external_research_enabled, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  revalidateWorkspacePaths();
  return NextResponse.json({ conversation: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await context.service
    .from("conversations")
    .delete()
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .select("id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  await logEvent("conversation_deleted", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    conversationId: id,
  });
  revalidateWorkspacePaths();
  return NextResponse.json({ deleted: true });
}
