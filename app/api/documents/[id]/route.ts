import { deleteDocumentVectors } from "@/lib/ai/pipeline/ingest";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document } = await context.service
    .from("documents")
    .select("id, file_path")
    .eq("id", params.id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  try {
    await deleteDocumentVectors(context.user.id, context.category, document.id);
  } catch (error) {
    console.warn("Vector deletion skipped:", error);
  }

  const { error: storageError } = await context.service.storage
    .from("documents")
    .remove([document.file_path]);
  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  const { error: deleteError } = await context.service
    .from("documents")
    .delete()
    .eq("id", document.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  await context.service.from("usage_logs").insert({
    user_id: context.user.id,
    category_slug: context.category,
    action: "document_delete",
  });

  return NextResponse.json({ success: true });
}
