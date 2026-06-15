import { startOfTodayUtc } from "@/lib/usage/daily";
import type { CategorySlug } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export function startOfMonthUtc() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

export async function getWorkspaceUsage(
  client: SupabaseClient,
  userId: string,
  category: CategorySlug,
) {
  const [storageResult, queriesResult, reportsResult] = await Promise.all([
    client
      .from("documents")
      .select("file_size")
      .eq("user_id", userId)
      .eq("category_slug", category),
    client
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category_slug", category)
      .eq("action", "query")
      .gte("created_at", startOfTodayUtc()),
    client
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category_slug", category)
      .eq("action", "report_generate")
      .gte("created_at", startOfMonthUtc()),
  ]);

  if (storageResult.error) throw storageResult.error;
  if (queriesResult.error) throw queriesResult.error;
  if (reportsResult.error) throw reportsResult.error;

  return {
    storageBytes: (storageResult.data ?? []).reduce(
      (total, document) => total + Number(document.file_size ?? 0),
      0,
    ),
    queriesToday: queriesResult.count ?? 0,
    reportsThisMonth: reportsResult.count ?? 0,
  };
}
