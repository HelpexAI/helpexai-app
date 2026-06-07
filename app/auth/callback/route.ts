import { createClient } from "@/lib/supabase/server";
import type { CategorySlug } from "@/types";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedCategory = url.searchParams.get("category");
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
    requestedCategory === "legal" || requestedCategory === "business"
      ? requestedCategory
      : metadataCategory === "legal" || metadataCategory === "business"
        ? metadataCategory
        : null;

  if (category) {
    const { error: accountError } = await supabase.from("accounts").upsert(
      {
        user_id: data.user.id,
        category_slug: category,
        plan: "free",
      },
      { onConflict: "user_id,category_slug" },
    );

    if (accountError) {
      return NextResponse.redirect(
        new URL("/login?error=account_creation", url.origin),
      );
    }
  }

  const safeNext = next?.startsWith("/") ? next : "/dashboard";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
