import { WorkspaceSelector } from "@/components/auth/workspace-selector";
import { QueryProvider } from "@/components/providers/query-provider";
import { createClient } from "@/lib/supabase/server";
import type { CategorySlug } from "@/types";
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

  if (!accounts?.length) {
    await supabase.auth.signOut();
    redirect("/login?error=no_accounts");
  }
  if (accounts.length === 1) redirect("/dashboard");

  return (
    <QueryProvider>
      <WorkspaceSelector
        categories={accounts.map((account) => account.category_slug as CategorySlug)}
      />
    </QueryProvider>
  );
}
