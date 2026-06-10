import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceCategory } from "@/lib/dashboard/active-workspace";
import { getDocumentLimitState } from "@/lib/usage/limits";
import type { CategorySlug, PlanSlug } from "@/types";
import type { Product } from "@/types";
import { normalizePlanSlug } from "@/lib/stripe/plans";
import { getActiveProduct, getActiveProducts, getProductForAccount } from "@/lib/products/catalog";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

export interface CurrentWorkspace {
  userId: string;
  email: string;
  name: string;
  initials: string;
  category: CategorySlug;
  product: Product;
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

  if (activeCategory && await getActiveProduct(activeCategory)) {
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
      return buildWorkspace(user, await getProductForAccount(activeCategory), plan, documentLimit);
    }
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("category_slug, plan, deletion_requested_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  const activeSlugs = new Set((await getActiveProducts()).map((product) => product.slug));
  const activeAccounts = accounts?.filter((account) => activeSlugs.has(account.category_slug)) ?? [];
  if (!activeAccounts.length) redirect("/login?error=no_accounts");
  if (activeAccounts.some(account => account.deletion_requested_at)) redirect("/login?account=deletion-requested");
  if (activeAccounts.length > 1) redirect("/select-workspace");
  const account = activeAccounts[0];
  const category = account.category_slug as CategorySlug;
  const plan = normalizePlanSlug(account.plan);
  const documentLimit = await getDocumentLimitState(supabase, user.id, category, plan);
  return buildWorkspace(user, await getProductForAccount(category), plan, documentLimit);
});

function buildWorkspace(
  user: User,
  product: Product,
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
    category: product.slug,
    product,
    plan,
    documentsOverLimit: documentLimit.requiresResolution,
    documentsUsed: documentLimit.used,
    documentsLimit: documentLimit.limit,
    preferences: userPreferences(user),
  };
}
