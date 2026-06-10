import { createClient, createServiceClient } from "@/lib/supabase/server";
import { setActiveWorkspaceCookie } from "@/lib/dashboard/workspace-session";
import type { CategorySlug } from "@/types";
import { NextResponse } from "next/server";
import { getActiveProducts, isActiveProductSlug } from "@/lib/products/catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedCategory = url.searchParams.get("category");
  const mode = url.searchParams.get("mode");
  const next = url.searchParams.get("next");
  const supabase = await createClient();

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth_callback", url.origin));
  }

  const metadataCategory = data.user.user_metadata.category_slug;
  const category: CategorySlug | null =
    (await isActiveProductSlug(requestedCategory))
      ? requestedCategory
      : (await isActiveProductSlug(metadataCategory))
        ? metadataCategory
        : null;

  if (category && mode === "signup") {
    const { error: accountError } = await createServiceClient()
      .from("accounts")
      .upsert(
        {
          user_id: data.user.id,
          category_slug: category,
          plan: "free",
        },
        { onConflict: "user_id,category_slug" },
      );

    if (accountError) {
      await supabase.auth.signOut();
      return NextResponse.redirect(
        new URL("/login?error=account_creation", url.origin),
      );
    }
  }

  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  if (category && mode === "signup") {
    const response = NextResponse.redirect(new URL(safeNext, url.origin));
    setActiveWorkspaceCookie(response, category);
    return response;
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("category_slug")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: true });

  const activeSlugs = new Set((await getActiveProducts()).map((product) => product.slug));
  const activeAccounts = accounts?.filter((account) => activeSlugs.has(account.category_slug)) ?? [];
  if (accountsError || !activeAccounts.length) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=no_accounts", url.origin));
  }

  if (activeAccounts.length > 1) {
    return NextResponse.redirect(new URL("/select-workspace", url.origin));
  }

  const response = NextResponse.redirect(new URL(safeNext, url.origin));
  setActiveWorkspaceCookie(response, activeAccounts[0].category_slug as CategorySlug);
  return response;
}
