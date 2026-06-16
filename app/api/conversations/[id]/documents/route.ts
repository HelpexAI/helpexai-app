import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { logEvent } from "@/lib/monitoring";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  document_ids: z.array(z.string().uuid()).min(1).max(100),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json(
      { error: "Choose which documents to keep before attaching documents." },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Select at least one document." }, { status: 400 });
  }
  const documentIds = Array.from(new Set(parsed.data.document_ids));
  const [{ data: conversation }, { data: documents }] = await Promise.all([
    context.service
      .from("conversations")
      .select("id, conversation_scope")
      .eq("id", id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .maybeSingle(),
    context.service
      .from("documents")
      .select("id")
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .eq("status", "ready")
      .in("id", documentIds),
  ]);
  if (!conversation) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  if (conversation.conversation_scope === "workplace") {
    return NextResponse.json({ error: "Workplace conversations do not use attached documents." }, { status: 400 });
  }
  if (documents?.length !== documentIds.length) {
    return NextResponse.json({ error: "Only ready documents from this workspace can be attached." }, { status: 400 });
  }

  const { data, error } = await context.service
    .from("conversations")
    .update({ selected_document_ids: documentIds, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, selected_document_ids, updated_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logEvent("conversation_documents_attached", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    conversationId: id,
    selectedDocumentIds: documentIds,
  });
  revalidateWorkspacePaths();
  return NextResponse.json({ conversation: data });
}
