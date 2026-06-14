import { revalidateWorkspacePaths } from "@/lib/cache/revalidate";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { logEvent, reportError } from "@/lib/monitoring";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sanitizeTextForStorage } from "@/lib/text/sanitize";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_REPORT_CONTENT_CHARACTERS = 250_000;
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

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableString(value: unknown) {
  return cleanString(value) || null;
}

function cleanStringArray(value: unknown) {
  return Array.from(
    new Set(
      Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [],
    ),
  );
}

function normalizeSourceType(value: unknown): SourceType {
  if (value === "collection" || value === "mixed") return value;
  return "documents";
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
  if (!data?.id) throw new Error("Active workspace account was not found.");
  return data.id;
}

async function validateSourceDocuments({
  context,
  sourceDocumentIds,
  sourceType,
  collectionId,
}: {
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>;
  sourceDocumentIds: string[];
  sourceType: SourceType;
  collectionId: string | null;
}) {
  const { data, error } = await context.service
    .from("documents")
    .select("id, collection_id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .eq("status", "ready")
    .in("id", sourceDocumentIds);
  if (error) throw error;
  if ((data ?? []).length !== sourceDocumentIds.length) {
    throw new Error("One or more selected report source documents are invalid.");
  }
  if (
    sourceType === "collection" &&
    (!collectionId ||
      (data ?? []).some((document) => document.collection_id !== collectionId))
  ) {
    throw new Error("Report source documents do not belong to the selected collection.");
  }
}

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(
    `report-save:${context.user.id}:${context.category}`,
    10,
    60,
  );
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as SaveReportRequest | null;
  if (!body) return NextResponse.json({ error: "Invalid request body." }, { status: 400 });

  const title = sanitizeTextForStorage(cleanString(body.title)).slice(0, 160);
  const content = sanitizeTextForStorage(cleanString(body.content)).slice(
    0,
    MAX_REPORT_CONTENT_CHARACTERS,
  );
  const prompt = sanitizeTextForStorage(cleanString(body.prompt)).slice(0, 20_000);
  const templateId = cleanNullableString(body.template_id);
  const templateSlug = cleanNullableString(body.template_slug);
  const templateSnapshot =
    body.template_snapshot && typeof body.template_snapshot === "object"
      ? body.template_snapshot
      : {};
  const sourceType = normalizeSourceType(body.source_type);
  const sourceDocumentIds = cleanStringArray(body.source_document_ids);
  const collectionId = cleanNullableString(body.collection_id);
  const tokensUsed =
    typeof body.tokens_used === "number" && Number.isFinite(body.tokens_used)
      ? Math.max(0, Math.round(body.tokens_used))
      : 0;

  if (!title || !content || !prompt || !sourceDocumentIds.length) {
    return NextResponse.json(
      { error: "Title, report content, prompt, and source documents are required." },
      { status: 400 },
    );
  }

  try {
    await validateSourceDocuments({
      context,
      sourceDocumentIds,
      sourceType,
      collectionId,
    });
    const accountId = await getAccountId(context);
    const generatedAt = new Date().toISOString();
    const { data: createdReport, error } = await context.service.rpc(
      "create_report_with_sources",
      {
        p_report: {
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
          status: "draft",
          source_type: sourceType,
          collection_id: collectionId,
          generated_document_id: null,
          model: null,
          error_message: null,
          metadata: { tokens_used: tokensUsed, published_to_knowledge_base: false },
          generated_at: generatedAt,
        },
        p_source_document_ids: sourceDocumentIds,
      },
    );
    if (error || !createdReport) {
      throw new Error(error?.message ?? "Could not create the report draft. Apply migration 015.");
    }

    const report = createdReport as unknown as {
      id: string;
      title: string;
      status: string;
      generated_document_id: string | null;
      generated_at: string | null;
      created_at: string;
      updated_at: string;
    };

    await logEvent("report_draft_created", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      reportId: report.id,
      title,
      sourceDocumentCount: sourceDocumentIds.length,
    });
    revalidateWorkspacePaths();
    return NextResponse.json({ report, document: null, embedded: false, warning: null }, { status: 201 });
  } catch (error) {
    await reportError(error, {
      area: "report-draft-save",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      title,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save report draft." },
      { status: 500 },
    );
  }
}
