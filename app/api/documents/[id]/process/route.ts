import { ingestDocument } from "@/lib/ai/pipeline/ingest";
import { isEmbeddingUnavailable } from "@/lib/ai/pipeline/query";
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
  let processingWarning: string | null = null;

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
    console.error("Document embedding failed:", error);
    processingWarning = isEmbeddingUnavailable(error)
      ? "Semantic indexing is waiting for available OpenAI embedding quota. Document chat will use the text fallback."
      : "Semantic indexing failed. Verify the OpenAI and Qdrant configuration, then retry processing.";
  }

  const { data: updated, error: updateError } = await context.service
    .from("documents")
    .update({ status: "ready", chunk_count: chunkCount, error_message: processingWarning })
    .eq("id", document.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    document: updated,
    embedded: chunkCount > 0,
    warning: processingWarning,
  });
}
