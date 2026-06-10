import { setActiveWorkspaceCookie } from "@/lib/dashboard/workspace-session";
import { createClient } from "@/lib/supabase/server";
import type { CategorySlug } from "@/types";
import { NextResponse } from "next/server";
import { getActiveProduct } from "@/lib/products/catalog";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    category?: CategorySlug;
  } | null;
  const category = body?.category;

  const product = await getActiveProduct(category);
  if (!category || !product) {
    return NextResponse.json({ error: "Choose a valid Helpex account." }, { status: 400 });
  }

  const { data: account, error } = await supabase
    .from("accounts")
    .select("category_slug")
    .eq("user_id", user.id)
    .eq("category_slug", category)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!account) {
    return NextResponse.json(
      {
        error: `No ${product.name} account exists for this email.`,
      },
      { status: 404 },
    );
  }

  const response = NextResponse.json({ category });
  setActiveWorkspaceCookie(response, category);
  return response;
}
