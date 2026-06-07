import { createClient } from "@/lib/supabase/server";
import type { CategorySlug, PlanSlug } from "@/types";
import { redirect } from "next/navigation";

export interface CurrentWorkspace {
  userId: string;
  email: string;
  name: string;
  initials: string;
  category: CategorySlug;
  plan: PlanSlug;
}

export async function getCurrentWorkspace(): Promise<CurrentWorkspace> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("category_slug, plan")
    .order("created_at", { ascending: true })
    .limit(1);

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

  return {
    userId: user.id,
    email: user.email ?? "",
    name,
    initials: initials || "U",
    category: account?.category_slug === "business" ? "business" : "legal",
    plan: account?.plan === "pro" ? "pro" : "free",
  };
}
