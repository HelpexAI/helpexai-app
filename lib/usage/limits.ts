import type { CategorySlug, PlanSlug } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDocumentLimitState(
  client: SupabaseClient,
  userId: string,
  category: CategorySlug,
  plan: PlanSlug,
) {
  const [{ data: planRow }, { count }] = await Promise.all([
    client
      .from("plans")
      .select("max_documents")
      .eq("slug", plan)
      .eq("category_slug", category)
      .maybeSingle(),
    client
      .from("documents")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category_slug", category),
  ]);

  const limit = planRow?.max_documents ?? (plan === "pro" ? 50 : 1);
  const used = count ?? 0;

  return {
    used,
    limit,
    requiresResolution: used > limit,
  };
}
