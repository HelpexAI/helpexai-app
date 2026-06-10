import { createClient, createServiceClient } from "@/lib/supabase/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { z } from "zod";
import { NextResponse } from "next/server";
import { isActiveProductSlug } from "@/lib/products/catalog";

const schema = z.object({ category: z.string().min(1).max(63) });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = await enforceRateLimit(`account-create:${user.id}`, 5, 3600);
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !(await isActiveProductSlug(parsed.data.category))) {
    return NextResponse.json({ error: "Choose a valid active product." }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service.from("accounts").upsert(
    { user_id: user.id, category_slug: parsed.data.category, plan: "free" },
    { onConflict: "user_id,category_slug", ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: true });
}
