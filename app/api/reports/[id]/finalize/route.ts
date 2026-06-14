import { ingestTextDocument } from "@/lib/ai/pipeline/ingest";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { deleteOwnedDocument } from "@/lib/documents/delete";
import {
  getDocumentRequestContext,
  safeStorageFilename,
} from "@/lib/documents/server";
import { logEvent, reportError } from "@/lib/monitoring";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
type CollectionRecord = { id: string; name: string; ai_context: string };
type TagRecord = { id: string; name: string; ai_context: string };

async function ensureReportsCollection(
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>,
): Promise<CollectionRecord> {
  const { data: existing, error: existingError } = await context.service
    .from("collections")
    .select("id, name, ai_context")
    .eq("category_slug", context.category)
    .eq("name", "Reports & Proposals")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing as CollectionRecord;

  const { data, error } = await context.service
    .from("collections")
    .insert({
      category_slug: context.category,
      name: "Reports & Proposals",
      description: "Finalized business reports and proposals.",
      ai_context:
        "Treat these as finalized synthesized reports. Verify important claims against original sources.",
      icon: "chart-no-axes-column",
      sort_order: 40,
      is_active: true,
    })
    .select("id, name, ai_context")
    .single();
  if (error) throw error;
  return data as CollectionRecord;
}

async function ensureReportTag(
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>,
): Promise<TagRecord> {
  const { data, error } = await context.service
    .from("tags")
    .upsert(
      {
        category_slug: context.category,
        name: "Report",
        description: "A finalized generated business report.",
        ai_context:
          "Document type: finalized report. Treat it as synthesized analysis, not an original source.",
        color: "violet",
        sort_order: 45,
        is_active: true,
      },
      { onConflict: "category_slug,name" },
    )
    .select("id, name, ai_context")
    .single();
  if (error) throw error;
  return data as TagRecord;
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    versionId?: unknown;
    title?: unknown;
    publishToKnowledgeBase?: unknown;
  } | null;
  const versionId = typeof body?.versionId === "string" ? body.versionId : "";
  const requestedTitle =
    typeof body?.title === "string" ? body.title.trim().slice(0, 160) : "";
  const publishToKnowledgeBase = body?.publishToKnowledgeBase === true;
  if (!versionId) {
    return NextResponse.json(
      { error: "Select a report version to finalize." },
      { status: 400 },
    );
  }

  let createdDocument: { id: string; file_path: string } | null = null;

  try {
    const { data: report, error: reportLookupError } = await context.service
      .from("reports")
      .select("id, status, generated_document_id, metadata")
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
      return NextResponse.json(
        { error: "Selected report version was not found." },
        { status: 404 },
      );
    }

    const finalTitle = requestedTitle || version.title;
    let generatedDocumentId = report.generated_document_id;

    if (publishToKnowledgeBase) {
      if (context.documentLimit.requiresResolution) {
        return NextResponse.json(
          {
            error: "Choose which documents to keep before publishing this report.",
            code: "DOCUMENT_LIMIT_RESOLUTION_REQUIRED",
          },
          { status: 403 },
        );
      }

      const [collection, reportTag] = await Promise.all([
        ensureReportsCollection(context),
        ensureReportTag(context),
      ]);
      const contentBuffer = Buffer.from(version.content_markdown, "utf-8");
      const documentId = report.generated_document_id ?? crypto.randomUUID();
      const storagePath =
        report.generated_document_id
          ? (
              await context.service
                .from("documents")
                .select("file_path")
                .eq("id", report.generated_document_id)
                .eq("user_id", context.user.id)
                .eq("category_slug", context.category)
                .single()
            ).data?.file_path
          : `${context.user.id}/${context.category}/${documentId}/${safeStorageFilename(`${finalTitle}.md`)}`;
      if (!storagePath) throw new Error("Could not prepare report document storage.");

      if (!report.generated_document_id) {
        const { data: reservation, error: reservationError } =
          await context.service.rpc("reserve_document_uploads", {
            p_user_id: context.user.id,
            p_category_slug: context.category,
            p_documents: [
              {
                id: documentId,
                name: finalTitle,
                file_path: storagePath,
                file_size: contentBuffer.byteLength,
                file_type: "txt",
                collection_id: collection.id,
              },
            ],
          });
        if (reservationError) {
          throw new Error("Document collection protection is unavailable.");
        }
        const quota = reservation?.[0];
        if (!quota?.allowed) {
          return NextResponse.json(
            {
              error: `Your ${context.plan} plan storage limit has been reached.`,
              code: "DOCUMENT_LIMIT_REACHED",
              used: quota?.used ?? 0,
              limit: quota?.quota_limit ?? 30 * 1024 * 1024,
            },
            { status: 403 },
          );
        }
        createdDocument = { id: documentId, file_path: storagePath };
      }

      const { error: storageError } = await context.service.storage
        .from("documents")
        .upload(storagePath, contentBuffer, {
          contentType: "text/markdown; charset=utf-8",
          upsert: Boolean(report.generated_document_id),
        });
      if (storageError) throw storageError;

      if (!report.generated_document_id) {
        const { error: tagError } = await context.service
          .from("document_tag_assignments")
          .insert({ document_id: documentId, tag_id: reportTag.id });
        if (tagError) throw tagError;
      }

      let chunkCount = 0;
      let warning: string | null = null;
      try {
        const result = await ingestTextDocument({
          userId: context.user.id,
          categorySlug: context.category,
          docId: documentId,
          docName: finalTitle,
          text: version.content_markdown,
          collection: {
            name: collection.name,
            ai_context: collection.ai_context,
          },
          tags: [{ name: reportTag.name, ai_context: reportTag.ai_context }],
        });
        chunkCount = result.chunkCount;
      } catch (embeddingError) {
        warning = "Semantic indexing failed. Retry document processing later.";
        await reportError(embeddingError, {
          area: "report-finalize-embedding",
          userId: context.user.id,
          category: context.category,
          reportId: report.id,
        });
      }

      const { error: documentUpdateError } = await context.service
        .from("documents")
        .update({
          name: finalTitle,
          file_size: contentBuffer.byteLength,
          chunk_count: chunkCount,
          error_message: warning,
          status: "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("user_id", context.user.id)
        .eq("category_slug", context.category);
      if (documentUpdateError) throw documentUpdateError;
      generatedDocumentId = documentId;
    } else if (report.generated_document_id) {
      const { data: legacyDocument, error: legacyDocumentError } =
        await context.service
          .from("documents")
          .select("id, file_path")
          .eq("id", report.generated_document_id)
          .eq("user_id", context.user.id)
          .eq("category_slug", context.category)
          .maybeSingle();
      if (legacyDocumentError) throw legacyDocumentError;
      if (legacyDocument) {
        await deleteOwnedDocument(
          context.service,
          context.user.id,
          context.category,
          legacyDocument,
        );
      }
      generatedDocumentId = null;
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
        generated_document_id: publishToKnowledgeBase ? generatedDocumentId : null,
        metadata: {
          ...metadata,
          published_to_knowledge_base: publishToKnowledgeBase,
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
      publishToKnowledgeBase,
      generatedDocumentId,
    });
    revalidateWorkspacePaths();
    return NextResponse.json({
      reportId: report.id,
      versionId: version.id,
      status: "finalized",
      publishedToKnowledgeBase: publishToKnowledgeBase,
      generatedDocumentId,
    });
  } catch (error) {
    if (createdDocument) {
      await deleteOwnedDocument(
        context.service,
        context.user.id,
        context.category,
        createdDocument,
      ).catch(() => undefined);
    }
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
