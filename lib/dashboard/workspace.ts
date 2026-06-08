import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceCategory } from "@/lib/dashboard/active-workspace";
import { getDocumentLimitState } from "@/lib/usage/limits";
import type { CategorySlug, PlanSlug } from "@/types";
import { normalizePlanSlug } from "@/lib/stripe/plans";
import { redirect } from "next/navigation";

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
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspace> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const activeCategory = await getActiveWorkspaceCategory();
  let accountsQuery = supabase
    .from("accounts")
    .select("category_slug, plan")
    .order("created_at", { ascending: true });

  if (activeCategory) {
    accountsQuery = accountsQuery.eq("category_slug", activeCategory);
  }

  let { data: accounts } = await accountsQuery.limit(1);

  if (activeCategory && !accounts?.length) {
    const fallback = await supabase
      .from("accounts")
      .select("category_slug, plan")
      .order("created_at", { ascending: true })
      .limit(1);
    accounts = fallback.data;
  }

  const account = accounts?.[0];
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

  const category = account?.category_slug === "business" ? "business" : "legal";
  const plan = normalizePlanSlug(account?.plan);
  const documentLimit = await getDocumentLimitState(supabase, user.id, category, plan);

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
  };
}
