import { getDocumentRequestContext } from "@/lib/documents/server";
import { mockStripeEnabled } from "@/lib/stripe/subscriptions";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  if (!mockStripeEnabled()) {
    return NextResponse.json({ error: "Mock checkout is disabled in production." }, { status: 404 });
  }

  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await context.service
    .from("accounts")
    .update({
      plan: "pro",
      subscription_status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
    })
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ url: "/billing?checkout=success" });
}
