import { createClient, createServiceClient } from "@/lib/supabase/server";
import { setActiveWorkspaceCookie } from "@/lib/dashboard/workspace-session";
import type { CategorySlug } from "@/types";
import { NextResponse } from "next/server";
import { getActiveProducts, isActiveProductSlug } from "@/lib/products/catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const emailType = url.searchParams.get("type");
  const callbackError = url.searchParams.get("error_code") ?? url.searchParams.get("error");
  const requestedCategory = url.searchParams.get("category");
  const mode = url.searchParams.get("mode");
  const next = url.searchParams.get("next");
  const isRecoveryCallback =
    next === "/reset-password" || mode === "recovery" || emailType === "recovery";
  const supabase = await createClient();

  if (callbackError) {
    const redirectUrl = new URL(
      isRecoveryCallback ? "/forgot-password" : "/login",
      url.origin,
    );
    redirectUrl.searchParams.set("error", callbackError);
    if (requestedCategory) redirectUrl.searchParams.set("category", requestedCategory);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code && !tokenHash) {
    const redirectUrl = new URL(
      isRecoveryCallback ? "/forgot-password" : "/login",
      url.origin,
    );
    redirectUrl.searchParams.set("error", "missing_code");
    if (requestedCategory) redirectUrl.searchParams.set("category", requestedCategory);
    return NextResponse.redirect(redirectUrl);
  }

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        type: (emailType as "signup" | "magiclink" | "invite" | "recovery") ?? "signup",
        token_hash: tokenHash as string,
      });

  if (error) {
    console.error("[auth callback] authentication exchange failed", error);
  }

  if (error || !data.user) {
    const redirectUrl = new URL(
      isRecoveryCallback ? "/forgot-password" : "/login",
      url.origin,
    );
    const errorCode =
      error?.code === "pkce_code_verifier_not_found"
        ? "pkce_code_verifier_not_found"
        : error?.message.toLowerCase().includes("fetch failed") || error?.status === 0
          ? "auth_fetch_failed"
          : "auth_callback";
    redirectUrl.searchParams.set(
      "error",
      errorCode,
    );
    if (requestedCategory) redirectUrl.searchParams.set("category", requestedCategory);
    return NextResponse.redirect(redirectUrl);
  }

  const metadataCategory = data.user.user_metadata.category_slug;
  const category: CategorySlug | null =
    (await isActiveProductSlug(requestedCategory))
      ? requestedCategory
      : (await isActiveProductSlug(metadataCategory))
        ? metadataCategory
        : null;
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (safeNext === "/reset-password" || mode === "recovery" || emailType === "recovery") {
    return NextResponse.redirect(new URL("/reset-password", url.origin));
  }

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
