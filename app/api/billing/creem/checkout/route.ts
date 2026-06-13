import { getDocumentRequestContext } from "@/lib/documents/server";
import { creemRequest, validCreemProductId } from "@/lib/creem/client";
import { CheckoutSchema } from "@/lib/validations/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CreemCheckoutResponse = {
  id: string;
  checkout_url: string;
  product_id?: string;
  status: string;
};

function isManagedCreemSubscriptionStatus(status?: string | null) {
  return status === "active" || status === "scheduled_cancel";
}

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit(
    `creem-checkout:${context.user.id}:${context.category}`,
    20,
    3600,
  );

  if (limited) return limited;

  const parsed = CheckoutSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Choose a valid paid plan." },
      { status: 400 },
    );
  }

  const targetPlan = parsed.data.plan_slug;

  const { data: account } = await context.service
    .from("accounts")
    .select("id, creem_customer_id, creem_subscription_id, subscription_status")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!account) {
    return NextResponse.json(
      { error: "Billing account was not found." },
      { status: 404 },
    );
  }

  const hasManagedCreemSubscription =
    Boolean(account.creem_subscription_id) &&
    isManagedCreemSubscriptionStatus(account.subscription_status);

  /**
   * If subscription is active or scheduled_cancel,
   * user should manage it from Creem portal.
   *
   * Do not create a second checkout for same account.
   */
  if (hasManagedCreemSubscription) {
    if (context.plan === targetPlan) {
      return NextResponse.json(
        { error: `You already have an active ${targetPlan} subscription.` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Use Manage Subscription to change or cancel your current plan.",
      },
      { status: 400 },
    );
  }

  const { data: plan } = await context.service
    .from("plans")
    .select("creem_product_id")
    .eq("slug", targetPlan)
    .eq("category_slug", context.category)
    .maybeSingle();

  const productId = validCreemProductId(plan?.creem_product_id)
    ? plan!.creem_product_id
    : null;

  if (!productId) {
    return NextResponse.json(
      {
        error: `Creem ${targetPlan} product is not configured for this product.`,
      },
      { status: 503 },
    );
  }

  try {
    const origin = new URL(request.url).origin;

    /**
     * New Creem subscription checkout.
     *
     * This is allowed when:
     * - no creem_subscription_id exists
     * - OR subscription_status is not active/scheduled_cancel
     *
     * Example allowed statuses:
     * cancelled, expired, paused, null
     */
    const checkout = await creemRequest<CreemCheckoutResponse>("/checkouts", {
      method: "POST",
      body: JSON.stringify({
        product_id: productId,
        request_id: account.id,
        success_url: `${origin}/api/billing/creem/return`,
        customer: {
          email: context.user.email,
        },
        metadata: {
          user_id: context.user.id,
          account_id: account.id,
          category_slug: context.category,
          plan_slug: targetPlan,
        },
      }),
    });

    return NextResponse.json({ url: checkout.checkout_url });
  } catch (error) {
    console.error("Creem checkout creation failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create Creem Checkout.",
      },
      { status: 502 },
    );
  }
}
