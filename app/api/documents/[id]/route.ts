import { deleteOwnedDocument } from "@/lib/documents/delete";
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
    await deleteOwnedDocument(context.service, context.user.id, context.category, document);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete document." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
