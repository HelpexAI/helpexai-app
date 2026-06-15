import { getDocumentRequestContext } from "@/lib/documents/server";
import { getProductForAccount } from "@/lib/products/catalog";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getDocumentRequestContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [collections, tags, plans, reportTemplates, product] = await Promise.all([
    context.service
      .from("collections")
      .select("*")
      .eq("category_slug", context.category)
      .eq("is_active", true)
      .order("sort_order"),
    context.service
      .from("tags")
      .select("*")
      .eq("category_slug", context.category)
      .eq("is_active", true)
      .order("sort_order"),
    context.service
      .from("plans")
      .select(
        "id, name, slug, category_slug, price_monthly, creem_prod_id, max_storage_bytes, max_queries_day, max_reports_month",
      )
      .eq("category_slug", context.category)
      .order("price_monthly"),
    context.service
      .from("report_templates")
      .select(
        "id, category_slug, slug, name, description, icon, type, goal, required_sections, writing_style, min_plan, sort_order",
      )
      .eq("category_slug", context.category)
      .eq("status", "active")
      .eq("visibility", "public")
      .order("sort_order"),
    getProductForAccount(context.category),
  ]);

  const error =
    collections.error ?? tags.error ?? plans.error ?? reportTemplates.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    category: context.category,
    product,
    collections: collections.data ?? [],
    tags: tags.data ?? [],
    plans: plans.data ?? [],
    reportTemplates: reportTemplates.data ?? [],
  });
}
