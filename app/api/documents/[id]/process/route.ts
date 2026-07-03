import { ingestDocument } from "@/lib/ai/pipeline/ingest";
import { isSemanticSearchUnavailable } from "@/lib/ai/pipeline/query";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";
import { logEvent, reportError } from "@/lib/monitoring";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { DocumentReadabilityError } from "@/lib/documents/readability";
import {
  ensureKnowledgeEntity,
  replaceKnowledgeChunks,
  updateKnowledgeStatus,
} from "@/lib/knowledge/service";

export const runtime = "nodejs";
export const maxDuration = 300;

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
    .select("*, collection:collections(id, name, ai_context), document_tag_assignments(tag:tags(id, name, ai_context))")
    .eq("id", id)
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  let chunkCount = 0;
  let processingWarning: string | null = null;
  const collection = Array.isArray(document.collection) ? document.collection[0] : document.collection;
  const assignedTags = (document.document_tag_assignments ?? []).flatMap((assignment: { tag: Array<{ id: string; name: string; ai_context: string }> | { id: string; name: string; ai_context: string } }) =>
    Array.isArray(assignment.tag) ? assignment.tag : [assignment.tag],
  ).filter(Boolean);
  const knowledge = await ensureKnowledgeEntity(context.service, {
    userId: context.user.id,
    categorySlug: context.category,
    sourceType: "document",
    itemType: "document",
    originId: document.id,
    title: document.name,
    status: "processing",
    collectionId: collection?.id ?? document.collection_id,
    tagIds: assignedTags.map((tag: { id: string }) => tag.id),
    metadata: {
      documentId: document.id,
      fileType: document.file_type,
      filePath: document.file_path,
    },
  });

  try {
    await logEvent("document_embedding_started", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      documentId: document.id,
      documentName: document.name,
    });
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
      collection: collection ?? undefined,
      tags: assignedTags,
      sourceType: "document",
      sourceId: knowledge.sourceId,
      itemId: knowledge.itemId,
      itemTitle: document.name,
    });
    chunkCount = result.chunkCount;
    await replaceKnowledgeChunks(
      context.service,
      knowledge,
      { userId: context.user.id, categorySlug: context.category },
      result.chunks,
    );
    await updateKnowledgeStatus(context.service, knowledge, "ready", {
      documentId: document.id,
      fileType: document.file_type,
      chunkCount,
    });
    await logEvent("document_embedding_completed", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      documentId: document.id,
      documentName: document.name,
      chunkCount,
    });
  } catch (error) {
    await reportError(error, {
      area: "document-embedding",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      documentId: document.id,
      documentName: document.name,
    });
    processingWarning = error instanceof DocumentReadabilityError
      ? error.message
      : isSemanticSearchUnavailable(error)
      ? "Semantic indexing is temporarily unavailable. Document chat will use the text fallback."
      : "Semantic indexing failed. Verify the OpenAI and Qdrant configuration, then retry processing.";
    await updateKnowledgeStatus(context.service, knowledge, "failed", {
      documentId: document.id,
      error: processingWarning,
    }).catch(() => undefined);
  }

  const { data: updated, error: updateError } = await context.service
    .from("documents")
    .update({
      status: "ready",
      chunk_count: chunkCount,
      error_message: processingWarning,
      knowledge_source_id: knowledge.sourceId,
      knowledge_item_id: knowledge.itemId,
    })
    .eq("id", document.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logEvent("document_ready", {
    userId: context.user.id,
    userEmail: context.user.email,
    category: context.category,
    documentId: document.id,
    documentName: document.name,
    embedded: chunkCount > 0,
    warning: processingWarning,
  });
  revalidateWorkspacePaths();
  return NextResponse.json({
    document: updated,
    embedded: chunkCount > 0,
    warning: processingWarning,
  });
}
