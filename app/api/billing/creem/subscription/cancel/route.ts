import { creemRequest } from "@/lib/creem/client";
import { getDocumentRequestContext } from "@/lib/documents/server";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CreemSubscriptionResponse = {
  id: string;
  status?: string;
  current_period_end_date?: string | null;
};

function isActiveStatus(status?: string | null) {
  return status === "active" || status === "trialing" || status === "past_due";
}

export async function POST() {
  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(
    `creem-subscription-cancel:${context.user.id}:${context.category}`,
    5,
    3600,
  );

  if (limited) return limited;

  const { data: account } = await context.service
    .from("accounts")
    .select("id, creem_subscription_id, subscription_status, plan")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!account?.creem_subscription_id) {
    return NextResponse.json(
      { error: "No active Creem subscription was found." },
      { status: 404 },
    );
  }

  if (!isActiveStatus(account.subscription_status)) {
    return NextResponse.json(
      { error: "This subscription is not active." },
      { status: 400 },
    );
  }

  try {
    const subscription = await creemRequest<CreemSubscriptionResponse>(
      `/subscriptions/${account.creem_subscription_id}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({
          mode: "scheduled",
          onExecute: "cancel",
        }),
      },
    );

    const { error } = await context.service
      .from("accounts")
      .update({
        billing_provider: "creem",
        subscription_status: "scheduled_cancel",
        creem_current_period_end:
          subscription.current_period_end_date ?? undefined,
      })
      .eq("id", account.id);

    if (error) throw error;

    return NextResponse.json({
      subscriptionStatus: "scheduled_cancel",
      currentPeriodEnd: subscription.current_period_end_date ?? null,
    });
  } catch (error) {
    console.error("Creem scheduled cancellation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not schedule subscription cancellation.",
      },
      { status: 502 },
    );
  }
}
