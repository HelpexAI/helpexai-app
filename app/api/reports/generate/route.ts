import { extractDocumentPages } from "@/lib/ai/pipeline/ingest";
import { getLLMProvider } from "@/lib/ai/factory";
import { stripAiDisclaimer } from "@/lib/ai/disclaimer";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { getProductPlan } from "@/lib/plans/catalog";
import { reportError, logEvent } from "@/lib/monitoring";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sanitizeTextForStorage } from "@/lib/text/sanitize";
import { NextResponse } from "next/server";
import type { PlanSlug } from "@/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_DOCUMENTS_FALLBACK = 10;
const MAX_CONTEXT_CHARACTERS = 45_000;
const MAX_DOCUMENT_CHARACTERS = 9_000;
const MAX_CUSTOM_INSTRUCTION_CHARACTERS = 8_000;
const PLAN_RANK: Record<PlanSlug, number> = { free: 0, pro: 1, premium: 2 };
type SourceType = "documents" | "collection";
type GenerateReportRequest = {
  template_id?: string;
  source_type?: SourceType;
  document_ids?: string[];
  collection_id?: string | null;
  custom_instructions?: string;
};
type ReportTemplateRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  goal: string;
  system_prompt: string;
  user_prompt_template: string;
  required_sections: string[] | null;
  writing_style: Record<string, unknown> | null;
  min_plan: string;
  max_documents: number | null;
  max_context_chunks: number | null;
};
type SourceDocumentRecord = {
  id: string;
  name: string;
  file_path: string;
  file_type: "pdf" | "docx" | "txt";
  collection_id: string | null;
  collection:
    | { name: string | null; ai_context: string | null }
    | { name: string | null; ai_context: string | null }[]
    | null;
  document_tag_assignments:
    | {
        tag:
          | { name: string | null; ai_context: string | null }
          | { name: string | null; ai_context: string | null }[]
          | null;
      }[]
    | null;
};

const CUSTOM_TEMPLATE_ID = "custom";

const CUSTOM_REPORT_TEMPLATE = {
  id: CUSTOM_TEMPLATE_ID,
  slug: "custom",
  name: "Custom report",
  description: "Create a report using your own prompt and instructions.",
  goal: "Generate a custom business report from the selected knowledge-base sources.",
  system_prompt:
    "You are HelpexAI, a professional business report assistant. Use the provided source context for facts about the selected documents. For general how-to steps, recommendations, structure, or best practices requested by the user, you may use professional general knowledge, but do not invent personal facts that are not present in the source context.",
  user_prompt_template: [
    "Create a custom report based on the selected documents or collection.",
    "",
    "User instructions:",
    "{{custom_instructions}}",
    "",
    "Selected sources:",
    "{{source_summary}}",
    "",
    "Important rules:",
    "- Use source context for facts about the user, company, documents, projects, numbers, names, and dates.",
    "- If the user asks for steps, strategy, recommendations, or structure, provide practical professional guidance.",
    "- If a required personal or document-specific fact is missing, say it is not available in the selected sources.",
    "- Return the final answer as a professional markdown report.",
  ].join("\n"),
  required_sections: [],
  writing_style: {
    tone: "professional",
    format: "markdown",
    clarity: "high",
  },
  min_plan: "free",
  max_documents: null,
  max_context_chunks: null,
};

function parseBody(value: unknown): GenerateReportRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as GenerateReportRequest;
}
function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
function buildSourceSummary(documents: SourceDocumentRecord[]) {
  return documents.map((document) => `- ${document.name}`).join("\n");
}
function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
function normalizeSourceType(value: unknown): SourceType {
  return value === "collection" ? "collection" : "documents";
}
function normalizeCollection(collection: SourceDocumentRecord["collection"]): {
  name?: string;
  aiContext?: string;
} {
  const item = Array.isArray(collection) ? collection[0] : collection;
  return {
    name: item?.name ?? undefined,
    aiContext: item?.ai_context ?? undefined,
  };
}
function normalizeTags(
  assignments: SourceDocumentRecord["document_tag_assignments"],
) {
  return (assignments ?? [])
    .flatMap((assignment) => {
      if (!assignment.tag) return [];
      return Array.isArray(assignment.tag) ? assignment.tag : [assignment.tag];
    })
    .filter(Boolean)
    .map((tag) => ({ name: tag.name ?? "", aiContext: tag.ai_context ?? "" }))
    .filter((tag) => tag.name);
}
function buildTemplateSnapshot(template: ReportTemplateRecord) {
  return {
    id: template.id,
    slug: template.slug,
    name: template.name,
    goal: template.goal,
    system_prompt: template.system_prompt,
    user_prompt_template: template.user_prompt_template,
    required_sections: template.required_sections ?? [],
    writing_style: template.writing_style ?? {},
    min_plan: template.min_plan,
  };
}
function buildReportTitle(templateName: string) {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
  return `${templateName} - ${date}`;
}
function buildContextBlock(
  documents: Array<{
    id: string;
    name: string;
    collectionName?: string;
    collectionContext?: string;
    tags: string[];
    tagContext?: string;
    text: string;
  }>,
  characterLimit = MAX_CONTEXT_CHARACTERS,
) {
  let remaining = Math.min(MAX_CONTEXT_CHARACTERS, characterLimit);
  const sections: string[] = [];
  for (const document of documents) {
    if (remaining <= 0) break;
    const text = document.text
      .trim()
      .slice(0, Math.min(MAX_DOCUMENT_CHARACTERS, remaining));
    if (!text) continue;
    remaining -= text.length;
    sections.push(
      [
        `Document ID: ${document.id}`,
        `Document Name: ${document.name}`,
        `Collection: ${document.collectionName ?? "Uncategorized"}`,
        document.tags.length ? `Tags: ${document.tags.join(", ")}` : null,
        document.collectionContext
          ? `Collection Context: ${document.collectionContext}`
          : null,
        document.tagContext ? `Tag Context: ${document.tagContext}` : null,
        "",
        text,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
  return sections
    .map((section, index) => `--- SOURCE DOCUMENT ${index + 1} ---\n${section}`)
    .join("\n\n");
}
async function loadDocumentText({
  context,
  document,
}: {
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>;
  document: SourceDocumentRecord;
}) {
  const { data: file, error: downloadError } = await context.service.storage
    .from("documents")
    .download(document.file_path);
  if (downloadError || !file) {
    throw new Error(`Could not download ${document.name}.`);
  }
  const pages = await extractDocumentPages(
    Buffer.from(await file.arrayBuffer()),
    document.file_type,
  );
  const text = sanitizeTextForStorage(
    pages
      .map((page) =>
        page.pageNumber ? `[Page ${page.pageNumber}]\n${page.text}` : page.text,
      )
      .join("\n\n"),
  );
  return text;
}
async function loadSourceDocuments({
  context,
  sourceType,
  documentIds,
  collectionId,
  maxDocuments,
}: {
  context: NonNullable<Awaited<ReturnType<typeof getDocumentRequestContext>>>;
  sourceType: SourceType;
  documentIds: string[];
  collectionId: string | null;
  maxDocuments: number;
}) {
  let query = context.service
    .from("documents")
    .select(
      [
        "id",
        "name",
        "file_path",
        "file_type",
        "collection_id",
        "collection:collections(name, ai_context)",
        "document_tag_assignments(tag:tags(name, ai_context))",
      ].join(", "),
    )
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .eq("status", "ready")
    .limit(maxDocuments + 1);
  if (sourceType === "collection") {
    if (!collectionId) {
      throw new Error("Collection is required.");
    }
    query = query.eq("collection_id", collectionId);
  } else {
    if (!documentIds.length) {
      throw new Error("Select at least one document.");
    }
    query = query.in("id", documentIds);
  }
  const { data, error } = await query;
  if (error) throw error;
  const documents = (data ?? []) as unknown as SourceDocumentRecord[];
  if (!documents.length) {
    throw new Error("No ready source documents were found.");
  }
  if (documents.length > maxDocuments) {
    throw new Error(`This report template supports up to ${maxDocuments} source documents. Reduce your selection and try again.`);
  }
  return documents;
}
export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = await enforceRateLimit(
    `report-generate:${context.user.id}:${context.category}`,
    6,
    60,
  );
  if (limited) return limited;
  if (context.documentLimit.requiresResolution) {
    return NextResponse.json(
      {
        error: "Choose which documents to keep before generating reports.",
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
  const templateId = cleanString(body.template_id);
  const isCustomTemplate = templateId === CUSTOM_TEMPLATE_ID;
  const sourceType = normalizeSourceType(body.source_type);
  const documentIds = cleanStringArray(body.document_ids);
  const collectionId = cleanString(body.collection_id) || null;
  const customInstructions = sanitizeTextForStorage(
    cleanString(body.custom_instructions),
  ).slice(0, MAX_CUSTOM_INSTRUCTION_CHARACTERS);
  const usageRequestId = crypto.randomUUID();
  if (!templateId) {
    return NextResponse.json(
      { error: "Report template is required." },
      { status: 400 },
    );
  }
  if (isCustomTemplate && customInstructions.length < 10) {
    return NextResponse.json(
      { error: "Please write a custom prompt or instruction for this report." },
      { status: 400 },
    );
  }
  try {
    const { data: template, error: templateError } = isCustomTemplate
      ? { data: CUSTOM_REPORT_TEMPLATE, error: null }
      : await context.service
          .from("report_templates")
          .select(
            [
              "id",
              "slug",
              "name",
              "description",
              "goal",
              "system_prompt",
              "user_prompt_template",
              "required_sections",
              "writing_style",
              "min_plan",
              "max_documents",
              "max_context_chunks",
            ].join(", "),
          )
          .eq("id", templateId)
          .eq("category_slug", context.category)
          .eq("status", "active")
          .eq("visibility", "public")
          .maybeSingle();
    if (templateError) throw templateError;
    if (!template) {
      return NextResponse.json(
        { error: "Report template was not found." },
        { status: 404 },
      );
    }
    const typedTemplate = template as unknown as ReportTemplateRecord;
    const currentPlan = context.plan === "pro" || context.plan === "premium" ? context.plan : "free";
    const requiredPlan = typedTemplate.min_plan === "pro" || typedTemplate.min_plan === "premium" ? typedTemplate.min_plan : "free";
    if (PLAN_RANK[currentPlan] < PLAN_RANK[requiredPlan]) {
      return NextResponse.json(
        { error: `This report template requires the ${requiredPlan} plan.`, code: "REPORT_PLAN_REQUIRED" },
        { status: 403 },
      );
    }
    const maxDocuments =
      typedTemplate.max_documents && typedTemplate.max_documents > 0
        ? Math.min(typedTemplate.max_documents, MAX_DOCUMENTS_FALLBACK)
        : MAX_DOCUMENTS_FALLBACK;
    const sourceDocuments = await loadSourceDocuments({
      context,
      sourceType,
      documentIds,
      collectionId,
      maxDocuments,
    });
    await logEvent("report_generation_started", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      templateId: typedTemplate.id,
      templateSlug: typedTemplate.slug,
      sourceType,
      sourceDocumentCount: sourceDocuments.length,
    });
    const loadedDocuments = await Promise.all(
      sourceDocuments.map(async (document) => {
        const collection = normalizeCollection(document.collection);
        const tags = normalizeTags(document.document_tag_assignments);
        const text = await loadDocumentText({ context, document });
        if (!text.trim()) return null;
        return {
          id: document.id,
          name: document.name,
          collectionName: collection.name,
          collectionContext: collection.aiContext,
          tags: tags.map((tag) => tag.name),
          tagContext: tags
            .map((tag) => tag.aiContext)
            .filter(Boolean)
            .join(" "),
          text,
        };
      }),
    );
    const documentsWithText = loadedDocuments.filter(
      (document): document is NonNullable<typeof document> => document !== null,
    );
    if (!documentsWithText.length) {
      return NextResponse.json(
        {
          error:
            "No readable text was found in the selected documents. Scanned PDFs are not supported yet.",
        },
        { status: 422 },
      );
    }
    const contextCharacterLimit = typedTemplate.max_context_chunks && typedTemplate.max_context_chunks > 0
      ? typedTemplate.max_context_chunks * 1_500
      : MAX_CONTEXT_CHARACTERS;
    const contextBlock = buildContextBlock(documentsWithText, contextCharacterLimit);

    const sourceSummary = buildSourceSummary(sourceDocuments);

    const requiredSections = typedTemplate.required_sections?.length
      ? typedTemplate.required_sections
          .map((section) => `- ${section}`)
          .join("\n")
      : "Use the best structure for the user's request.";

    const renderedTemplatePrompt = typedTemplate.user_prompt_template
      .replaceAll(
        "{{custom_prompt}}",
        customInstructions.trim() || "No extra instructions provided.",
      )
      .replaceAll(
        "{{custom_instructions}}",
        customInstructions.trim() || "No extra instructions provided.",
      )
      .replaceAll("{{source_summary}}", sourceSummary)
      .replaceAll("{{required_sections}}", requiredSections)
      .replaceAll("{{report_goal}}", typedTemplate.goal)
      .replaceAll(
        "{{source_context}}",
        "The full source context is appended below.",
      )
      .replaceAll("{{context}}", "The full source context is appended below.");

    const outputInstructions = [
      "- Return only the final report.",
      "- Use markdown formatting.",
      `- Required sections:\n${requiredSections}`,
      `- Writing style configuration: ${JSON.stringify(typedTemplate.writing_style ?? {})}`,
      "- Do not say that no source context was provided if the context above contains document text.",
      "- If some information is missing from the selected documents, mention only that specific gap.",
    ].join("\n");

    const finalPrompt = [
      renderedTemplatePrompt,
      "",
      "==============================",
      "FULL SOURCE CONTEXT",
      "==============================",
      "",
      contextBlock,
      "",
      "==============================",
      "FINAL OUTPUT INSTRUCTIONS",
      "==============================",
      "",
      outputInstructions,
    ].join("\n");

    const llm = getLLMProvider();
    if (!contextBlock.trim()) {
      return NextResponse.json(
        {
          error:
            "No readable text was found in the selected source documents. Try selecting different documents or reprocessing them.",
        },
        { status: 400 },
      );
    }
    const { data: reservation, error: reservationError } = await context.service.rpc(
      "reserve_monthly_report",
      {
        p_user_id: context.user.id,
        p_category_slug: context.category,
        p_request_id: usageRequestId,
      },
    );
    if (reservationError) {
      const plan = await getProductPlan(context.service, context.category, context.plan);
      const monthStart = new Date(
        Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1),
      ).toISOString();
      const { count } = await context.service
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", context.user.id)
        .eq("category_slug", context.category)
        .eq("action", "report_generate")
        .gte("created_at", monthStart);
      const used = count ?? 0;
      const limit = plan.max_reports_month ?? 5;
      if (used >= limit) {
        return NextResponse.json(
          {
            error: `You have reached this month's ${limit}-report limit.`,
            code: "REPORT_LIMIT_REACHED",
            used,
            limit,
          },
          { status: 403 },
        );
      }
      const { error: fallbackUsageError } = await context.service
        .from("usage_logs")
        .insert({
          user_id: context.user.id,
          category_slug: context.category,
          action: "report_generate",
          tokens_used: 0,
          request_id: usageRequestId,
        });
      if (fallbackUsageError) {
        throw new Error(`Could not reserve report usage: ${fallbackUsageError.message}`);
      }
    }
    const quota = reservation?.[0];
    if (reservation && !quota?.allowed) {
      return NextResponse.json(
        {
          error: `You have reached this month's ${quota?.quota_limit ?? 5}-report limit.`,
          code: "REPORT_LIMIT_REACHED",
          used: quota?.used ?? quota?.quota_limit ?? 5,
          limit: quota?.quota_limit ?? 5,
        },
        { status: 403 },
      );
    }
    const rawContent = await llm.complete(
      finalPrompt,
      typedTemplate.system_prompt,
    );
    const content = sanitizeTextForStorage(stripAiDisclaimer(rawContent));
    const title = buildReportTitle(typedTemplate.name);
    const tokensUsed = Math.ceil(content.length / 4);
    await context.service
      .from("usage_logs")
      .update({ tokens_used: tokensUsed })
      .eq("request_id", usageRequestId);
    await logEvent("report_generation_completed", {
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      templateId: typedTemplate.id,
      templateSlug: typedTemplate.slug,
      sourceType,
      sourceDocumentCount: sourceDocuments.length,
      tokensUsed,
    });
    return NextResponse.json({
      title,
      content,
      // Persist only the instructions and source names. Full source text stays server-side.
      prompt: `${renderedTemplatePrompt}\n\nFINAL OUTPUT INSTRUCTIONS\n${outputInstructions}`,
      template: {
        id: typedTemplate.id,
        slug: typedTemplate.slug,
        name: typedTemplate.name,
        description: typedTemplate.description,
        goal: typedTemplate.goal,
        required_sections: typedTemplate.required_sections ?? [],
        writing_style: typedTemplate.writing_style ?? {},
      },
      template_snapshot: buildTemplateSnapshot(typedTemplate),
      source_type: sourceType,
      source_document_ids: sourceDocuments.map((document) => document.id),
      collection_id: sourceType === "collection" ? collectionId : null,
      tokensUsed,
    });
  } catch (error) {
    await context.service.from("usage_logs").delete().eq("request_id", usageRequestId);
    await reportError(error, {
      area: "report-generation",
      userId: context.user.id,
      userEmail: context.user.email,
      category: context.category,
      templateId,
      sourceType,
      selectedDocumentCount: documentIds.length,
      collectionId,
    });
    const message =
      error instanceof Error ? error.message : "Could not generate report.";
    return NextResponse.json(
      {
        error: message || "Could not generate report.",
        code: "REPORT_GENERATION_FAILED",
      },
      { status: 500 },
    );
  }
}
