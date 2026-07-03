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

function isScheduledCancelStatus(status?: string | null) {
  return status === "scheduled_cancel" || status === "scheduledcancel";
}

export async function POST() {
  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(
    `creem-subscription-resume:${context.user.id}:${context.category}`,
    5,
    3600,
  );

  if (limited) return limited;

  const { data: account } = await context.service
    .from("accounts")
    .select("id, creem_subscription_id, subscription_status")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!account?.creem_subscription_id) {
    return NextResponse.json(
      { error: "No Creem subscription was found." },
      { status: 404 },
    );
  }

  if (!isScheduledCancelStatus(account.subscription_status)) {
    return NextResponse.json(
      { error: "This subscription is not scheduled for cancellation." },
      { status: 400 },
    );
  }

  try {
    const subscription = await creemRequest<CreemSubscriptionResponse>(
      `/subscriptions/${account.creem_subscription_id}/resume`,
      {
        method: "POST",
      },
    );

    const { error } = await context.service
      .from("accounts")
      .update({
        billing_provider: "creem",
        subscription_status: "active",
        creem_current_period_end:
          subscription.current_period_end_date ?? undefined,
      })
      .eq("id", account.id);

    if (error) throw error;

    return NextResponse.json({
      subscriptionStatus: "active",
      currentPeriodEnd: subscription.current_period_end_date ?? null,
    });
  } catch (error) {
    console.error("Creem subscription resume failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not resume subscription.",
      },
      { status: 502 },
    );
  }
}
