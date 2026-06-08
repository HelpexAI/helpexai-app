import { ingestDocument } from "@/lib/ai/pipeline/ingest";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: document } = await context.service
    .from("documents")
    .select("*")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let chunkCount = 0;

  try {
    const { data: storedFile, error: downloadError } = await context.service.storage
      .from("documents")
      .download(document.file_path);

    if (downloadError) throw downloadError;

    const result = await ingestDocument({
      userId: context.user.id,
      categorySlug: context.category,
      docId: document.id,
      docName: document.name,
      fileBuffer: Buffer.from(await storedFile.arrayBuffer()),
      fileType: document.file_type,
    });
    chunkCount = result.chunkCount;
  } catch (error) {
    // Embedding is best-effort for now. The stored document remains usable.
    console.warn("Document embedding skipped:", error);
  }

  const { data: updated, error: updateError } = await context.service
    .from("documents")
    .update({ status: "ready", chunk_count: chunkCount, error_message: null })
    .eq("id", document.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ document: updated });
}
