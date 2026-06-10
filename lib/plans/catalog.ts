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
    .select("id, name, slug, category_slug, price_monthly, stripe_price_id, max_documents, max_queries_day")
    .eq("category_slug", category)
    .eq("slug", plan)
    .maybeSingle();

  return data ?? {
    id: `${category}_${plan}`,
    name: plan.charAt(0).toUpperCase() + plan.slice(1),
    slug: plan,
    category_slug: category,
    price_monthly: plan === "premium" ? 4900 : plan === "pro" ? 2900 : 0,
    stripe_price_id: null,
    ...PLAN_LIMITS[plan],
  };
}

export async function getProductPlans(client: SupabaseClient, category: CategorySlug): Promise<Plan[]> {
  const { data } = await client
    .from("plans")
    .select("id, name, slug, category_slug, price_monthly, stripe_price_id, max_documents, max_queries_day")
    .eq("category_slug", category)
    .order("price_monthly", { ascending: true });
  return (data ?? []) as Plan[];
}
