import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CategorySlug, FileType, PlanSlug } from "@/types";

export async function getDocumentRequestContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: account } = await supabase
    .from("accounts")
    .select("category_slug, plan")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return {
    user,
    category: (account?.category_slug === "business" ? "business" : "legal") as CategorySlug,
    plan: (account?.plan === "pro" ? "pro" : "free") as PlanSlug,
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
