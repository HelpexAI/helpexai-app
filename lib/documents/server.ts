import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspaceCategory } from "@/lib/dashboard/active-workspace";
import { getDocumentLimitState } from "@/lib/usage/limits";
import type { CategorySlug, FileType, PlanSlug } from "@/types";
import { normalizePlanSlug } from "@/lib/stripe/plans";

export async function getDocumentRequestContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const activeCategory = await getActiveWorkspaceCategory();
  let accountQuery = supabase
    .from("accounts")
    .select("category_slug, plan")
    .order("created_at", { ascending: true });

  if (activeCategory) {
    accountQuery = accountQuery.eq("category_slug", activeCategory);
  }

  let { data: account } = await accountQuery.limit(1).maybeSingle();

  if (activeCategory && !account) {
    const fallback = await supabase
      .from("accounts")
      .select("category_slug, plan")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    account = fallback.data;
  }

  if (!account) return null;

  const category = (account?.category_slug === "business" ? "business" : "legal") as CategorySlug;
  const plan = normalizePlanSlug(account?.plan) as PlanSlug;
  const service = createServiceClient();
  const documentLimit = await getDocumentLimitState(service, user.id, category, plan);

  return {
    user,
    category,
    plan,
    documentLimit,
    service,
  };
}

export async function getDocumentAccessContext() {
  const supabase = await createClient();
  const [userResult, category] = await Promise.all([
    supabase.auth.getUser(),
    getActiveWorkspaceCategory(),
  ]);
  const user = userResult.data.user;
  if (!user || !category) return null;
  return {
    user,
    category,
    service: createServiceClient(),
  };
}

export function fileTypeFromFile(file: File): FileType | null {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (file.type === "application/pdf" || extension === "pdf") return "pdf";
  if (
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return "docx";
  }
  if (file.type === "text/plain" || extension === "txt") return "txt";
  return null;
}

export function safeStorageFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
