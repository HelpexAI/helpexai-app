import { ingestTextDocument } from "@/lib/ai/pipeline/ingest";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { deleteOwnedDocument } from "@/lib/documents/delete";
import { getDocumentRequestContext } from "@/lib/documents/server";
import {
  ensureKnowledgeEntity,
  replaceKnowledgeChunks,
  updateKnowledgeStatus,
} from "@/lib/knowledge/service";
import { logEvent, reportError } from "@/lib/monitoring";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    versionId?: unknown;
    title?: unknown;
  } | null;
  const versionId = typeof body?.versionId === "string" ? body.versionId : "";
  const requestedTitle =
    typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  if (!versionId) {
    return NextResponse.json({ error: "Select a report version to finalize." }, { status: 400 });
  }

  try {
    const { data: report, error: reportLookupError } = await context.service
      .from("reports")
      .select("id, status, account_id, collection_id, generated_document_id, metadata")
      .eq("id", id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .maybeSingle();
    if (reportLookupError) throw reportLookupError;
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    if (report.status === "finalized") {
      return NextResponse.json({ error: "This report is already finalized." }, { status: 409 });
    }

    const { data: version, error: versionError } = await context.service
      .from("report_versions")
      .select("id, title, content_markdown")
      .eq("id", versionId)
      .eq("report_id", report.id)
      .maybeSingle();
    if (versionError) throw versionError;
    if (!version) {
      return NextResponse.json({ error: "Selected report version was not found." }, { status: 404 });
    }

    const finalTitle = requestedTitle || version.title;
    const knowledge = await ensureKnowledgeEntity(context.service, {
      userId: context.user.id,
      categorySlug: context.category,
      sourceType: "report",
      itemType: "report",
      originId: report.id,
      title: finalTitle,
      status: "processing",
      contentPreview: version.content_markdown,
      collectionId: report.collection_id,
      metadata: { reportId: report.id, currentVersionId: version.id },
    });

    let chunkCount = 0;
    let indexingWarning: string | null = null;
    try {
      const result = await ingestTextDocument({
        userId: context.user.id,
        categorySlug: context.category,
        docId: report.id,
        docName: finalTitle,
        text: version.content_markdown,
        sourceType: "report",
        sourceId: knowledge.sourceId,
        itemId: knowledge.itemId,
        itemTitle: finalTitle,
      });
      chunkCount = result.chunkCount;
      await replaceKnowledgeChunks(
        context.service,
        knowledge,
        { userId: context.user.id, categorySlug: context.category },
        result.chunks,
      );
      await updateKnowledgeStatus(context.service, knowledge, "ready", {
        reportId: report.id,
        currentVersionId: version.id,
        chunkCount,
      });
    } catch (embeddingError) {
      indexingWarning = "The report was saved, but semantic indexing will need to be retried.";
      await updateKnowledgeStatus(context.service, knowledge, "failed", {
        reportId: report.id,
        currentVersionId: version.id,
        error: indexingWarning,
      }).catch(() => undefined);
      await reportError(embeddingError, {
        area: "report-finalize-embedding",
        userId: context.user.id,
        category: context.category,
        reportId: report.id,
      });
    }

    // Clean up reports published as fake documents by the previous architecture.
    if (report.generated_document_id) {
      const { data: legacyDocument } = await context.service
        .from("documents")
        .select("id, file_path")
        .eq("id", report.generated_document_id)
        .eq("user_id", context.user.id)
        .eq("category_slug", context.category)
        .maybeSingle();
      if (legacyDocument) {
        await deleteOwnedDocument(context.service, context.user.id, context.category, legacyDocument);
      }
    }

    const { error: versionTitleError } = await context.service
      .from("report_versions")
      .update({ title: finalTitle })
      .eq("id", version.id)
      .eq("report_id", report.id);
    if (versionTitleError) throw versionTitleError;

    const metadata =
      report.metadata && typeof report.metadata === "object" && !Array.isArray(report.metadata)
        ? report.metadata
        : {};
    const { error: updateError } = await context.service
      .from("reports")
      .update({
        title: finalTitle,
        content: version.content_markdown,
        current_version_id: version.id,
        generated_document_id: null,
        knowledge_source_id: knowledge.sourceId,
        knowledge_item_id: knowledge.itemId,
        metadata: {
          ...metadata,
          published_to_knowledge_base: true,
          knowledge_index_warning: indexingWarning,
          knowledge_chunk_count: chunkCount,
        },
        status: "finalized",
        updated_at: new Date().toISOString(),
      })
      .eq("id", report.id)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category);
    if (updateError) throw updateError;

    await logEvent("report_finalized", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      reportId: report.id,
      versionId: version.id,
      knowledgeSourceId: knowledge.sourceId,
      knowledgeItemId: knowledge.itemId,
      chunkCount,
      indexingWarning,
    });
    revalidateWorkspacePaths();
    return NextResponse.json({
      reportId: report.id,
      versionId: version.id,
      status: "finalized",
      knowledgeSourceId: knowledge.sourceId,
      knowledgeItemId: knowledge.itemId,
      indexed: chunkCount > 0,
      warning: indexingWarning,
    });
  } catch (error) {
    await reportError(error, {
      area: "report-finalize",
      userId: context.user.id,
      category: context.category,
      reportId: id,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not finalize report." },
      { status: 500 },
    );
  }
}
