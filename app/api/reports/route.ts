import { getDocumentRequestContext } from "@/lib/documents/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [reportsResult, templatesResult, documentsResult] = await Promise.all([
    context.service
      .from("reports")
      .select(
        [
          "id",
          "title",
          "status",
          "template_id",
          "template_slug",
          "generated_document_id",
          "generated_at",
          "created_at",
          "updated_at",
        ].join(", "),
      )
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .order("updated_at", { ascending: false }),

    context.service
      .from("report_templates")
      .select(
        [
          "id",
          "category_slug",
          "slug",
          "name",
          "description",
          "icon",
          "type",
          "goal",
          "required_sections",
          "writing_style",
          "min_plan",
          "sort_order",
        ].join(", "),
      )
      .eq("category_slug", context.category)
      .eq("status", "active")
      .eq("visibility", "public")
      .order("sort_order", { ascending: true }),

    context.service
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.user.id)
      .eq("category_slug", context.category)
      .eq("status", "ready"),
  ]);

  if (reportsResult.error) {
    return NextResponse.json(
      { error: reportsResult.error.message },
      { status: 500 },
    );
  }

  if (templatesResult.error) {
    return NextResponse.json(
      { error: templatesResult.error.message },
      { status: 500 },
    );
  }

  if (documentsResult.error) {
    return NextResponse.json(
      { error: documentsResult.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    reports: reportsResult.data ?? [],
    templates: templatesResult.data ?? [],
    readyDocumentsCount: documentsResult.count ?? 0,
    category: context.category,
    plan: context.plan,
    locked: context.documentLimit.requiresResolution,
    documentLimit: {
      used: context.documentLimit.used,
      limit: context.documentLimit.limit,
      requiresResolution: context.documentLimit.requiresResolution,
    },
  });
}
