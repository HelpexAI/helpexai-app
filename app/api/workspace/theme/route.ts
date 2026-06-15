import { getActiveWorkspaceCategory } from "@/lib/dashboard/active-workspace";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  themeId: z.string().uuid().nullable(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Invalid theme selection." }, { status: 400 });
  }

  const category = await getActiveWorkspaceCategory();
  if (!category) {
    return NextResponse.json({ error: "No active workspace." }, { status: 400 });
  }

  if (body.data.themeId) {
    const { data: theme, error: themeError } = await createServiceClient()
      .from("themes")
      .select("id")
      .eq("id", body.data.themeId)
      .eq("is_active", true)
      .maybeSingle();

    if (themeError) {
      return NextResponse.json({ error: themeError.message }, { status: 500 });
    }

    if (!theme) {
      return NextResponse.json({ error: "Choose a valid active theme." }, { status: 400 });
    }
  }

  const { error } = await createServiceClient()
    .from("accounts")
    .update({ dashboard_theme_id: body.data.themeId })
    .eq("user_id", user.id)
    .eq("category_slug", category);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, themeId: body.data.themeId });
}

