import { WorkspaceSelector } from "@/components/auth/workspace-selector";
import { QueryProvider } from "@/components/providers/query-provider";
import { createClient } from "@/lib/supabase/server";
import { getActiveProducts } from "@/lib/products/catalog";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Choose Workspace",
  description: "Choose the HelpexAI workspace you want to open.",
};

export default async function SelectWorkspacePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: accounts } = await supabase
    .from("accounts")
    .select("category_slug")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const products = (await getActiveProducts()).filter((product) =>
    accounts?.some((account) => account.category_slug === product.slug),
  );
  if (!products.length) {
    await supabase.auth.signOut();
    redirect("/login?error=no_accounts");
  }
  if (products.length === 1) redirect("/dashboard");

  return (
    <QueryProvider>
      <WorkspaceSelector
        products={products}
      />
    </QueryProvider>
  );
}
