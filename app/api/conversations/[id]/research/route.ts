import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { logEvent } from "@/lib/monitoring";
import { ConversationResearchSchema } from "@/lib/validations/schemas";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ConversationResearchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose whether External Research is enabled." }, { status: 400 });
  }

  const { data, error } = await context.service
    .from("conversations")
    .update({
      external_research_enabled: parsed.data.external_research_enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .select("id, title, conversation_scope, selected_document_ids, external_research_enabled, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });

  await logEvent("conversation_external_research_updated", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    conversationId: id,
    externalResearchEnabled: parsed.data.external_research_enabled,
  });
  revalidateWorkspacePaths();
  return NextResponse.json({ conversation: data });
}
