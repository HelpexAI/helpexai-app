import { getDocumentRequestContext } from "@/lib/documents/server";
import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== "DELETE") {
    return NextResponse.json({ error: 'Type "DELETE" to confirm.' }, { status: 400 });
  }

  const { data: accounts } = await context.service
    .from("accounts")
    .select("stripe_subscription_id")
    .eq("user_id", context.user.id)

  for (const account of accounts ?? []) {
    if (account.stripe_subscription_id) {
      try {
        await stripe.subscriptions.cancel(account.stripe_subscription_id);
      } catch (error) {
        console.warn("Subscription cancellation during deletion request skipped:", error);
      }
    }
  }

  const { error } = await context.service
    .from("accounts")
    .update({
      deletion_requested_at: new Date().toISOString(),
      plan: "free",
      subscription_status: "cancelled",
    })
    .eq("user_id", context.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
