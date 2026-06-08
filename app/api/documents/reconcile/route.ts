import { deleteOwnedDocument } from "@/lib/documents/delete";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { getDocumentLimitState } from "@/lib/usage/limits";
import { z } from "zod";
import { NextResponse } from "next/server";

const ReconcileDocumentsSchema = z.object({
  keep_document_ids: z.array(z.string().uuid()),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = ReconcileDocumentsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid document selection." }, { status: 400 });

  const state = await getDocumentLimitState(context.service, context.user.id, context.category, context.plan);
  const keepIds = Array.from(new Set(parsed.data.keep_document_ids));
  if (keepIds.length !== state.limit) {
    return NextResponse.json({ error: `Select exactly ${state.limit} document${state.limit === 1 ? "" : "s"} to keep.` }, { status: 400 });
  }

  const { data: documents } = await context.service
    .from("documents")
    .select("id, file_path")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category);
  if (!documents || !keepIds.every((id) => documents.some((document) => document.id === id))) {
    return NextResponse.json({ error: "One or more selected documents are unavailable." }, { status: 400 });
  }

  const deletedIds = documents.filter((document) => !keepIds.includes(document.id)).map((document) => document.id);
  const { data: conversations } = await context.service
    .from("conversations")
    .select("id, selected_document_ids")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category);
  const conversationIds = (conversations ?? [])
    .filter((conversation) => conversation.selected_document_ids.some((id: string) => deletedIds.includes(id)))
    .map((conversation) => conversation.id);
  if (conversationIds.length) {
    const { error } = await context.service.from("conversations").delete().in("id", conversationIds);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    for (const document of documents.filter((item) => deletedIds.includes(item.id))) {
      await deleteOwnedDocument(context.service, context.user.id, context.category, document);
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not delete excess documents." }, { status: 500 });
  }

  return NextResponse.json({ success: true, kept: keepIds, deleted: deletedIds });
}
