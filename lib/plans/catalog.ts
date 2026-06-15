import { PLAN_LIMITS } from "@/lib/stripe/plans";
import type { CategorySlug, Plan, PlanSlug } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getProductPlan(
  client: SupabaseClient,
  category: CategorySlug,
  plan: PlanSlug,
): Promise<Plan> {
  const { data } = await client
    .from("plans")
    .select(
      "id, name, slug, category_slug, price_monthly, creem_prod_id, max_storage_bytes, max_queries_day, max_reports_month",
    )
    .eq("category_slug", category)
    .eq("slug", plan)
    .maybeSingle();
  return (
    data ?? {
      id: `${category}_${plan}`,
      name: plan.charAt(0).toUpperCase() + plan.slice(1),
      slug: plan,
      category_slug: category,
      price_monthly: plan === "premium" ? 1999 : plan === "pro" ? 999 : 0,
      creem_prod_id: null,
      ...PLAN_LIMITS[plan],
    }
  );
}

export async function getProductPlans(
  client: SupabaseClient,
  category: CategorySlug,
): Promise<Plan[]> {
  const { data } = await client
    .from("plans")
    .select(
      "id, name, slug, category_slug, price_monthly, creem_prod_id, max_storage_bytes, max_queries_day, max_reports_month",
    )
    .eq("category_slug", category)
    .order("price_monthly", { ascending: true });
  return (data ?? []) as Plan[];
}
