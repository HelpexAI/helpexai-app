import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceCategory } from "@/lib/dashboard/active-workspace";
import { getDocumentLimitState } from "@/lib/usage/limits";
import type { CategorySlug, PlanSlug } from "@/types";
import { normalizePlanSlug, PLAN_LIMITS } from "@/lib/stripe/plans";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

export interface CurrentWorkspace {
  userId: string;
  email: string;
  name: string;
  initials: string;
  category: CategorySlug;
  plan: PlanSlug;
  documentsOverLimit: boolean;
  documentsUsed: number;
  documentsLimit: number;
  preferences: {
    showCitations: boolean;
    documentReady: boolean;
    productUpdates: boolean;
    usageWarnings: boolean;
  };
}

function userPreferences(user: User) {
  return {
    showCitations: user.user_metadata.show_citations !== false,
    documentReady: user.user_metadata.document_ready_notifications !== false,
    productUpdates: user.user_metadata.product_update_notifications === true,
    usageWarnings: user.user_metadata.usage_warning_notifications !== false,
  };
}

export const getCurrentWorkspace = cache(async (): Promise<CurrentWorkspace> => {
  const supabase = await createClient();
  const [userResult, activeCategory] = await Promise.all([
    supabase.auth.getUser(),
    getActiveWorkspaceCategory(),
  ]);
  const user = userResult.data.user;

  if (!user) {
    redirect("/login");
  }

  if (activeCategory) {
    const [accountResult, documentLimit] = await Promise.all([
      supabase
        .from("accounts")
        .select("category_slug, plan, deletion_requested_at")
        .eq("user_id", user.id)
        .eq("category_slug", activeCategory)
        .maybeSingle(),
      getDocumentLimitState(supabase, user.id, activeCategory, "free"),
    ]);
    const account = accountResult.data;
    if (account) {
      if (account.deletion_requested_at) redirect("/login?account=deletion-requested");
      const plan = normalizePlanSlug(account.plan);
      const limit = PLAN_LIMITS[plan].max_documents;
      return buildWorkspace(user, activeCategory, plan, {
        ...documentLimit,
        limit,
        requiresResolution: documentLimit.used > limit,
      });
    }
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("category_slug, plan, deletion_requested_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (!accounts?.length) redirect("/login?error=no_accounts");
  if (accounts.some(account => account.deletion_requested_at)) redirect("/login?account=deletion-requested");
  if (accounts.length > 1) redirect("/select-workspace");
  const account = accounts[0];
  const category = account.category_slug === "business" ? "business" : "legal";
  const plan = normalizePlanSlug(account.plan);
  const documentLimit = await getDocumentLimitState(supabase, user.id, category, plan);
  return buildWorkspace(user, category, plan, documentLimit);
});

function buildWorkspace(
  user: User,
  category: CategorySlug,
  plan: PlanSlug,
  documentLimit: Awaited<ReturnType<typeof getDocumentLimitState>>,
): CurrentWorkspace {
  const metadataName =
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email?.split("@")[0] ??
    "User";
  const name = String(metadataName)
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  return {
    userId: user.id,
    email: user.email ?? "",
    name,
    initials: initials || "U",
    category,
    plan,
    documentsOverLimit: documentLimit.requiresResolution,
    documentsUsed: documentLimit.used,
    documentsLimit: documentLimit.limit,
    preferences: userPreferences(user),
  };
}
