import type { CategorySlug, PlanSlug } from "@/types";
import { getProductPlan } from "@/lib/plans/catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function getDocumentLimitState(
  client: SupabaseClient,
  userId: string,
  category: CategorySlug,
  plan: PlanSlug,
) {
  const { data } = await client
    .from("documents")
    .select("file_size")
    .eq("user_id", userId)
    .eq("category_slug", category);

  const limit = (await getProductPlan(client, category, plan)).max_storage_bytes;
  const used = (data ?? []).reduce((total, document) => total + document.file_size, 0);

  return {
    used,
    limit,
    // Storage quotas prevent new uploads; existing documents remain usable.
    requiresResolution: false,
  };
}
