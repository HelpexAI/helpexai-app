import type { CategorySlug, PlanSlug } from "@/types";
import { getProductPlan } from "@/lib/plans/catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDocumentLimitState(
  client: SupabaseClient,
  userId: string,
  category: CategorySlug,
  plan: PlanSlug,
) {
  const { count } = await client
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("category_slug", category);

  const limit = (await getProductPlan(client, category, plan)).max_documents;
  const used = count ?? 0;

  return {
    used,
    limit,
    requiresResolution: used > limit,
  };
}
