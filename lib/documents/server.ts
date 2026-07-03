import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getActiveWorkspaceCategory } from "@/lib/dashboard/active-workspace";
import { getDocumentLimitState } from "@/lib/usage/limits";
import type { CategorySlug, FileType, PlanSlug } from "@/types";
import { normalizePlanSlug } from "@/lib/plans/limits";
import { getActiveProducts } from "@/lib/products/catalog";

export async function getDocumentRequestContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const activeCategory = await getActiveWorkspaceCategory();
  const activeSlugs = new Set((await getActiveProducts()).map((product) => product.slug));
  let accountQuery = supabase
    .from("accounts")
    .select("category_slug, plan")
    .order("created_at", { ascending: true });

  if (activeCategory && activeSlugs.has(activeCategory)) {
    accountQuery = accountQuery.eq("category_slug", activeCategory);
  }

  let { data: account } = await accountQuery.limit(1).maybeSingle();

  if (activeCategory && activeSlugs.has(activeCategory) && !account) {
    const fallback = await supabase
      .from("accounts")
      .select("category_slug, plan")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    account = fallback.data;
  }

  if (!account) return null;
  if (!activeSlugs.has(account.category_slug)) return null;

  const category = account.category_slug as CategorySlug;
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
