import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceCategory } from "@/lib/dashboard/active-workspace";
import { getDocumentLimitState } from "@/lib/usage/limits";
import type { CategorySlug, PlanSlug } from "@/types";
import type { Product } from "@/types";
import { normalizePlanSlug } from "@/lib/stripe/plans";
import {
  getActiveProduct,
  getActiveProducts,
  getProductForAccount,
} from "@/lib/products/catalog";
import { getThemeById } from "@/lib/themes/catalog";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

type WorkspaceAccountRow = {
  id: string;
  category_slug: CategorySlug;
  plan: string;
  deletion_requested_at: string | null;
  dashboard_theme_id: string | null;
};

export interface CurrentWorkspace {
  userId: string;
  email: string;
  name: string;
  initials: string;
  category: CategorySlug;
  product: Product;
  plan: PlanSlug;
  accountId: string;
  selectedThemeId: string | null;
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

export const getCurrentWorkspace = cache(
  async (): Promise<CurrentWorkspace> => {
    const supabase = await createClient();
    const [userResult, activeCategory] = await Promise.all([
      supabase.auth.getUser(),
      getActiveWorkspaceCategory(),
    ]);
    const user = userResult.data.user;

    if (!user) {
      redirect("/login");
    }

    if (activeCategory && (await getActiveProduct(activeCategory))) {
      const [accountResult] = await Promise.all([
        supabase
          .from("accounts")
          .select("id, category_slug, plan, deletion_requested_at, dashboard_theme_id")
          .eq("user_id", user.id)
          .eq("category_slug", activeCategory)
          .maybeSingle(),
      ]);
      const documentLimit = await getDocumentLimitState(
        supabase,
        user.id,
        activeCategory,
        normalizePlanSlug(accountResult.data?.plan ?? "free"),
      );

      const account = accountResult.data as WorkspaceAccountRow | null;
      if (account) {
        if (account.deletion_requested_at)
          redirect("/login?account=deletion-requested");
        const plan = normalizePlanSlug(account.plan);
        const selectedTheme =
          (await getThemeById(account.dashboard_theme_id)) ?? null;
        const product = await getProductForAccount(activeCategory);
        const themedProduct = {
          ...product,
          theme: selectedTheme?.primary ? selectedTheme : product.theme,
        };
        return buildWorkspace(
          user,
          themedProduct,
          plan,
          documentLimit,
          account.id,
          account.dashboard_theme_id ?? null,
        );
      }
    }

    const { data: accounts } = await supabase
      .from("accounts")
      .select("category_slug, plan, deletion_requested_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const activeSlugs = new Set(
      (await getActiveProducts()).map((product) => product.slug),
    );
    const activeAccounts =
      accounts?.filter((account) => activeSlugs.has(account.category_slug)) ??
      [];
    if (!activeAccounts.length) redirect("/login?error=no_accounts");
    if (activeAccounts.some((account) => account.deletion_requested_at))
      redirect("/login?account=deletion-requested");
    if (activeAccounts.length > 1) redirect("/select-workspace");
    const account = activeAccounts[0] as WorkspaceAccountRow;
    const category = account.category_slug as CategorySlug;
    const plan = normalizePlanSlug(account.plan);
    const selectedTheme = (await getThemeById(account.dashboard_theme_id)) ?? null;
    const documentLimit = await getDocumentLimitState(
      supabase,
      user.id,
      category,
      plan,
    );
    const product = await getProductForAccount(category);
    return buildWorkspace(
      user,
      {
        ...product,
        theme: selectedTheme?.primary ? selectedTheme : product.theme,
      },
      plan,
      documentLimit,
      account.id,
      account.dashboard_theme_id ?? null,
    );
  },
);

function buildWorkspace(
  user: User,
  product: Product,
  plan: PlanSlug,
  documentLimit: Awaited<ReturnType<typeof getDocumentLimitState>>,
  accountId: string,
  selectedThemeId: string | null,
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
    accountId,
    selectedThemeId,
    documentsOverLimit: documentLimit.requiresResolution,
    documentsUsed: documentLimit.used,
    documentsLimit: documentLimit.limit,
    preferences: userPreferences(user),
  };
}
