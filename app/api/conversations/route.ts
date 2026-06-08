import { getDocumentRequestContext } from "@/lib/documents/server";
import { CreateConversationSchema } from "@/lib/validations/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export async function GET() {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json({
      locked: true,
      used: context.documentLimit.used,
      limit: context.documentLimit.limit,
    });
  }

  const [{ data: conversations, error: conversationsError }, { data: documents, error: documentsError }] = await Promise.all([
    context.service.from("conversations").select("id, title, selected_document_ids, updated_at").eq("user_id", context.user.id).eq("category_slug", context.category).order("updated_at", { ascending: false }),
    context.service.from("documents").select("id, name, file_size, file_type").eq("user_id", context.user.id).eq("category_slug", context.category).neq("status", "failed").order("created_at", { ascending: false }),
  ]);
  if (conversationsError || documentsError) {
    return NextResponse.json({ error: conversationsError?.message ?? documentsError?.message }, { status: 500 });
  }

  return NextResponse.json({
    locked: false,
    conversations: conversations ?? [],
    documents: documents ?? [],
    category: context.category,
  });
}

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(`conversation-create:${context.user.id}:${context.category}`, 20, 60);
  if (limited) return limited;
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json(
      { error: "Choose which documents to keep before starting conversations.", code: "DOCUMENT_LIMIT_RESOLUTION_REQUIRED" },
      { status: 403 },
    );
  }

  const parsed = CreateConversationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.category_slug !== context.category) {
    return NextResponse.json(
      { error: parsed.success ? "Wrong active workspace." : parsed.error.issues[0]?.message },
      { status: 400 },
    );
  }

  const documentIds = Array.from(new Set(parsed.data.selected_document_ids));
  const { data: documents } = await context.service
    .from("documents")
    .select("id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .in("id", documentIds);

  if (documents?.length !== documentIds.length) {
    return NextResponse.json({ error: "One or more selected documents are unavailable." }, { status: 400 });
  }

  const { data: conversation, error } = await context.service
    .from("conversations")
    .insert({
      user_id: context.user.id,
      category_slug: context.category,
      title: "New Conversation",
      selected_document_ids: documentIds,
      is_locked: true,
    })
    .select("id, title, selected_document_ids, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ conversation }, { status: 201 });
}
