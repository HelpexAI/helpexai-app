import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlanSlug = "free" | "pro" | "premium";

const PLAN_RANK: Record<PlanSlug, number> = {
  free: 0,
  pro: 1,
  premium: 2,
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

function normalizePlan(value: string | null | undefined): PlanSlug {
  if (value === "pro" || value === "premium") return value;
  return "free";
}

function canUseTemplate(userPlan: PlanSlug, minPlan: PlanSlug) {
  return PLAN_RANK[userPlan] >= PLAN_RANK[minPlan];
}

export async function GET(request: Request) {
  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const templateId = url.searchParams.get("template");
  const isCustomTemplate = templateId === CUSTOM_TEMPLATE_ID;

  if (!templateId) {
    return NextResponse.json(
      { error: "Report template is required." },
      { status: 400 },
    );
  }

  const [templateResult, documentsResult, collectionsResult] =
    await Promise.all([
      isCustomTemplate
        ? Promise.resolve({ data: CUSTOM_REPORT_TEMPLATE, error: null })
        : context.service
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
              ].join(", "),
            )
            .eq("id", templateId)
            .eq("category_slug", context.category)
            .eq("status", "active")
            .eq("visibility", "public")
            .maybeSingle(),

      context.service
        .from("documents")
        .select(
          ["id", "name", "file_type", "created_at", "collection_id"].join(", "),
        )
        .eq("user_id", context.user.id)
        .eq("category_slug", context.category)
        .eq("status", "ready")
        .order("created_at", { ascending: false }),

      context.service
        .from("collections")
        .select("id, name, description, sort_order")
        .eq("category_slug", context.category)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (templateResult.error) {
    return NextResponse.json(
      { error: templateResult.error.message },
      { status: 500 },
    );
  }

  if (documentsResult.error) {
    return NextResponse.json(
      { error: documentsResult.error.message },
      { status: 500 },
    );
  }

  if (collectionsResult.error) {
    return NextResponse.json(
      { error: collectionsResult.error.message },
      { status: 500 },
    );
  }

  const template = (isCustomTemplate
    ? CUSTOM_REPORT_TEMPLATE
    : templateResult.data) as unknown as typeof CUSTOM_REPORT_TEMPLATE | null;

  if (!template) {
    return NextResponse.json(
      { error: "Report template was not found." },
      { status: 404 },
    );
  }

  const userPlan = normalizePlan(context.plan);
  const minPlan = normalizePlan(template.min_plan);

  if (!canUseTemplate(userPlan, minPlan)) {
    return NextResponse.json(
      { error: `This report template requires the ${minPlan} plan.` },
      { status: 403 },
    );
  }

  const documents =
    (documentsResult.data as unknown as Array<{ id: string; name: string; file_type: string; created_at: string; collection_id: string | null }> | null)?.map((document) => ({
      id: document.id,
      name: document.name,
      summary: null,
      file_type: document.file_type,
      created_at: document.created_at,
      collection_id: document.collection_id,
    })) ?? [];

  const documentCountByCollection = new Map<string, number>();

  for (const document of documents) {
    if (!document.collection_id) continue;

    documentCountByCollection.set(
      document.collection_id,
      (documentCountByCollection.get(document.collection_id) ?? 0) + 1,
    );
  }

  const collections =
    collectionsResult.data
      ?.map((collection) => ({
        id: collection.id,
        name: collection.name,
        description: collection.description,
        document_count: documentCountByCollection.get(collection.id) ?? 0,
      }))
      .filter((collection) => collection.document_count > 0) ?? [];

  return NextResponse.json({
    template,
    documents,
    collections,
    plan: userPlan,
  });
}
