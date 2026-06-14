import { ingestTextDocument } from "@/lib/ai/pipeline/ingest";
import { isEmbeddingUnavailable } from "@/lib/ai/pipeline/query";
import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import {
  getDocumentRequestContext,
  safeStorageFilename,
} from "@/lib/documents/server";
import { logEvent, reportError } from "@/lib/monitoring";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sanitizeTextForStorage } from "@/lib/text/sanitize";
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type SourceType = "documents" | "collection" | "mixed";
type SaveReportRequest = {
  title?: string;
  content?: string;
  prompt?: string;
  template_id?: string | null;
  template_slug?: string | null;
  template_snapshot?: Record<string, unknown>;
  source_type?: SourceType;
  source_document_ids?: string[];
  collection_id?: string | null;
  tokens_used?: number;
};
type CollectionRecord = { id: string; name: string; ai_context: string };
type TagRecord = { id: string; name: string; ai_context: string };
function parseBody(value: unknown): SaveReportRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as SaveReportRequest;
}
function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function cleanNullableString(value: unknown) {
  const text = cleanString(value);
  return text || null;
}
function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}
function normalizeSourceType(value: unknown): SourceType {
  if (value === "collection") return "collection";
  if (value === "mixed") return "mixed";
  return "documents";
}
function normalizeTokens(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
}
function buildStoragePath({
  userId,
  category,
  documentId,
  title,
}: {
  userId: string;
  category: string;
  documentId: string;
  title: string;
}) {
  const filename = safeStorageFilename(`${title}.txt`);
  return `${userId}/${category}/${documentId}/${filename}`;
}
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
  if (existing) {
    return existing as CollectionRecord;
  }
  const { data: created, error: createError } = await context.service
    .from("collections")
    .insert({
      category_slug: context.category,
      name: "Reports & Proposals",
      description: "Business reports, proposals, plans, and presentations.",
      ai_context:
        "Treat these as business analysis or proposed work. Focus on claims, assumptions, scope, metrics, deliverables, timelines, and decisions.",
      icon: "chart-no-axes-column",
      sort_order: 40,
      is_active: true,
    })
    .select("id, name, ai_context")
    .single();
  if (createError) throw createError;
  return created as CollectionRecord;
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
        description: "A generated or uploaded business report.",
        ai_context:
          "Document type: report. This is a generated business report created from selected knowledge-base documents. Treat it as synthesized analysis, not as an original source document.",
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
async function getAccountId(
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>,
) {
  const { data, error } = await context.service
    .from("accounts")
    .select("id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
async function validateSourceDocuments({
  context,
  sourceDocumentIds,
}: {
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>;
  sourceDocumentIds: string[];
}) {
  const { data, error } = await context.service
    .from("documents")
    .select("id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .eq("status", "ready")
    .in("id", sourceDocumentIds);
  if (error) throw error;
  const foundIds = new Set((data ?? []).map((document) => document.id));
  const missingIds = sourceDocumentIds.filter((id) => !foundIds.has(id));
  if (missingIds.length) {
    throw new Error(
      "One or more selected report source documents are invalid.",
    );
  }
}
export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(
    `report-save:${context.user.id}:${context.category}`,
    10,
    60,
  );
  if (limited) return limited;
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json(
      {
        error: "Choose which documents to keep before saving reports.",
        code: "DOCUMENT_LIMIT_RESOLUTION_REQUIRED",
      },
      { status: 403 },
    );
  }
  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }
  const title = sanitizeTextForStorage(cleanString(body.title)).slice(0, 160);
  const content = sanitizeTextForStorage(cleanString(body.content));
  const prompt = sanitizeTextForStorage(cleanString(body.prompt));
  const templateId = cleanNullableString(body.template_id);
  const templateSlug = cleanNullableString(body.template_slug);
  const templateSnapshot =
    body.template_snapshot && typeof body.template_snapshot === "object"
      ? body.template_snapshot
      : {};
  const sourceType = normalizeSourceType(body.source_type);
  const sourceDocumentIds = cleanStringArray(body.source_document_ids);
  const collectionId = cleanNullableString(body.collection_id);
  const tokensUsed = normalizeTokens(body.tokens_used);
  if (!title) {
    return NextResponse.json(
      { error: "Report title is required." },
      { status: 400 },
    );
  }
  if (!content) {
    return NextResponse.json(
      { error: "Report content is required." },
      { status: 400 },
    );
  }
  if (!prompt) {
    return NextResponse.json(
      { error: "Report prompt is required." },
      { status: 400 },
    );
  }
  if (!sourceDocumentIds.length) {
    return NextResponse.json(
      { error: "Report source documents are required." },
      { status: 400 },
    );
  }
  let documentId: string | null = null;
  let storagePath: string | null = null;
  let reportId: string | null = null;
  try {
    await validateSourceDocuments({ context, sourceDocumentIds });
    const [accountId, reportsCollection, reportTag] = await Promise.all([
      getAccountId(context),
      ensureReportsCollection(context),
      ensureReportTag(context),
    ]);
    documentId = crypto.randomUUID();
    storagePath = buildStoragePath({
      userId: context.user.id,
      category: context.category,
      documentId,
      title,
    });
    const fileBuffer = Buffer.from(content, "utf-8");
    const { data: reservation, error: reservationError } =
      await context.service.rpc("reserve_document_uploads", {
        p_user_id: context.user.id,
        p_category_slug: context.category,
        p_documents: [
          {
            id: documentId,
            name: `${title}.txt`,
            file_path: storagePath,
            file_size: fileBuffer.byteLength,
            file_type: "txt",
            collection_id: reportsCollection.id,
          },
        ],
      });
    if (reservationError) {
      throw new Error(
        "Document collection protection is unavailable. Apply migration 010.",
      );
    }
    const quota = reservation?.[0];
    if (!quota?.allowed) {
      return NextResponse.json(
        {
          error: `Your ${context.plan} plan allows ${quota?.quota_limit ?? 1} document${quota?.quota_limit === 1 ? "" : "s"}.`,
          code: "DOCUMENT_LIMIT_REACHED",
          used: quota?.used ?? 0,
          limit: quota?.quota_limit ?? 1,
        },
        { status: 403 },
      );
    }
    await logEvent("report_save_started", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      title,
      templateId,
      templateSlug,
      sourceType,
      sourceDocumentCount: sourceDocumentIds.length,
      generatedDocumentId: documentId,
    });
    const { error: storageError } = await context.service.storage
      .from("documents")
      .upload(storagePath, fileBuffer, {
        contentType: "text/plain; charset=utf-8",
        upsert: false,
      });
    if (storageError) {
      await context.service.from("documents").delete().eq("id", documentId);
      throw new Error(`Storage upload failed: ${storageError.message}`);
    }
    await context.service
      .from("documents")
      .update({ status: "processing" })
      .eq("id", documentId)
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category);
    const { error: tagError } = await context.service
      .from("document_tag_assignments")
      .insert({ document_id: documentId, tag_id: reportTag.id });
    if (tagError) {
      await reportError(tagError, {
        area: "report-save-tag-assignment",
        userId: context.user.id,
        category: context.category,
        documentId,
        tagId: reportTag.id,
      });
    }
    let chunkCount = 0;
    let processingWarning: string | null = null;
    try {
      const ingestResult = await ingestTextDocument({
        userId: context.user.id,
        categorySlug: context.category,
        docId: documentId,
        docName: `${title}.txt`,
        text: content,
        collection: {
          name: reportsCollection.name,
          ai_context: reportsCollection.ai_context,
        },
        tags: [{ name: reportTag.name, ai_context: reportTag.ai_context }],
      });
      chunkCount = ingestResult.chunkCount;
    } catch (embeddingError) {
      await reportError(embeddingError, {
        area: "report-save-embedding",
        userId: context.user.id,
        userEmail: context.user.email,
        category: context.category,
        documentId,
        title,
      });
      processingWarning = isEmbeddingUnavailable(embeddingError)
        ? "Semantic indexing is waiting for available OpenAI embedding quota."
        : "Semantic indexing failed. Retry document processing later.";
    }
    const { data: updatedDocument, error: documentUpdateError } =
      await context.service
        .from("documents")
        .update({
          status: "ready",
          chunk_count: chunkCount,
          error_message: processingWarning,
        })
        .eq("id", documentId)
        .eq("user_id", context.user.id)
        .eq("category_slug", context.category)
        .select("id, name, file_path, status, chunk_count, error_message")
        .single();
    if (documentUpdateError) throw documentUpdateError;
    const { data: report, error: reportInsertError } = await context.service
      .from("reports")
      .insert({
        user_id: context.user.id,
        account_id: accountId,
        category_slug: context.category,
        title,
        prompt,
        template_id: templateId,
        template_slug: templateSlug,
        template_snapshot: templateSnapshot,
        content,
        content_format: "markdown",
        status: "completed",
        source_type: sourceType,
        collection_id: collectionId,
        generated_document_id: documentId,
        model: null,
        error_message: null,
        metadata: {
          tokens_used: tokensUsed,
          generated_document_name: `${title}.txt`,
          embedded: chunkCount > 0,
          embedding_warning: processingWarning,
        },
        generated_at: new Date().toISOString(),
      })
      .select(
        "id, title, status, generated_document_id, generated_at, created_at, updated_at",
      )
      .single();
    if (reportInsertError) throw reportInsertError;
    reportId = report.id;
    const { error: sourceInsertError } = await context.service
      .from("report_sources")
      .insert(
        sourceDocumentIds.map((sourceDocumentId) => ({
          report_id: report.id,
          document_id: sourceDocumentId,
        })),
      );
    if (sourceInsertError) {
      await reportError(sourceInsertError, {
        area: "report-save-source-links",
        userId: context.user.id,
        category: context.category,
        reportId: report.id,
        sourceDocumentIds,
      });
    }
    await context.service.from("usage_logs").insert({
      user_id: context.user.id,
      category_slug: context.category,
      action: "report_generate",
      tokens_used: tokensUsed,
    });
    await logEvent("report_save_completed", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      reportId: report.id,
      title,
      templateId,
      templateSlug,
      generatedDocumentId: documentId,
      chunkCount,
      warning: processingWarning,
    });
    revalidateWorkspacePaths();
    return NextResponse.json(
      {
        report,
        document: updatedDocument,
        embedded: chunkCount > 0,
        warning: processingWarning,
      },
      { status: 201 },
    );
  } catch (error) {
    await reportError(error, {
      area: "report-save",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      reportId,
      documentId,
      storagePath,
      title,
      sourceType,
      sourceDocumentCount: sourceDocumentIds.length,
    });
    if (storagePath) {
      await context.service.storage.from("documents").remove([storagePath]);
    }
    if (documentId) {
      await context.service.from("documents").delete().eq("id", documentId);
    }
    if (reportId) {
      await context.service.from("reports").delete().eq("id", reportId);
    }
    const message =
      error instanceof Error ? error.message : "Could not save report.";
    return NextResponse.json(
      { error: message, code: "REPORT_SAVE_FAILED" },
      { status: 500 },
    );
  }
}
