import { setActiveWorkspaceCookie } from "@/lib/dashboard/workspace-session";
import { createClient } from "@/lib/supabase/server";
import type { CategorySlug } from "@/types";
import { NextResponse } from "next/server";
import { getActiveProducts } from "@/lib/products/catalog";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: accounts, error } = await supabase
    .from("accounts")
    .select("category_slug")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activeSlugs = new Set((await getActiveProducts()).map((product) => product.slug));
  const activeAccounts = accounts?.filter((account) => activeSlugs.has(account.category_slug)) ?? [];
  if (!activeAccounts.length) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "No Helpex account exists for this email." },
      { status: 404 },
    );
  }

  if (activeAccounts.length > 1) {
    return NextResponse.json({ next: "/select-workspace" });
  }

  const category = activeAccounts[0].category_slug as CategorySlug;
  const response = NextResponse.json({ next: "/dashboard", category });
  setActiveWorkspaceCookie(response, category);
  return response;
}
