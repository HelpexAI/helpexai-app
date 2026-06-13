import { getDocumentRequestContext } from "@/lib/documents/server";
import { stripe } from "@/lib/stripe/client";
import {
  updateAccountFromSubscription,
  validStripePriceId,
} from "@/lib/stripe/subscriptions";
import { CheckoutSchema } from "@/lib/validations/schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimit(
    `stripe-checkout:${context.user.id}:${context.category}`,
    5,
    3600,
  );
  if (limited) return limited;
  const parsed = CheckoutSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Choose a valid paid plan." },
      { status: 400 },
    );
  const targetPlan = parsed.data.plan_slug;

  const { data: account } = await context.service
    .from("accounts")
    .select("id, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();
  const { data: plan } = await context.service
    .from("plans")
    .select("stripe_price_id")
    .eq("slug", targetPlan)
    .eq("category_slug", context.category)
    .maybeSingle();

  const priceId = validStripePriceId(plan?.stripe_price_id)
    ? plan!.stripe_price_id
    : null;

  if (!priceId) {
    return NextResponse.json(
      {
        error: `Stripe ${targetPlan} price is not configured for this product.`,
      },
      { status: 503 },
    );
  }

  if (!account) {
    return NextResponse.json(
      { error: "Billing account was not found." },
      { status: 404 },
    );
  }

  if (context.plan === targetPlan && account.stripe_subscription_id) {
    return NextResponse.json(
      { error: `You already have a Stripe ${targetPlan} subscription.` },
      { status: 400 },
    );
  }

  let customerId = account.stripe_customer_id;
  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: context.user.email,
        metadata: { user_id: context.user.id, category_slug: context.category },
      });
      customerId = customer.id;
      const { error: customerSaveError } = await context.service
        .from("accounts")
        .update({ stripe_customer_id: customerId })
        .eq("id", account.id);
      if (customerSaveError) throw customerSaveError;
    }

    const origin = new URL(request.url).origin;
    if (account.stripe_subscription_id) {
      if (context.plan === "premium" || targetPlan !== "premium") {
        return NextResponse.json(
          {
            error:
              "Use Manage Subscription to change or cancel your current plan.",
          },
          { status: 400 },
        );
      }
      const subscription = await stripe.subscriptions.retrieve(
        account.stripe_subscription_id,
      );
      const item = subscription.items.data[0];
      if (!item) throw new Error("Stripe subscription item was not found.");
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.id,
        {
          items: [{ id: item.id, price: priceId }],
          metadata: {
            ...subscription.metadata,
            user_id: context.user.id,
            category_slug: context.category,
            plan_slug: targetPlan,
          },
          proration_behavior: "always_invoice",
        },
      );
      await updateAccountFromSubscription(updatedSubscription);
      return NextResponse.json({ url: `${origin}/billing?checkout=success` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: context.user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      success_url: `${origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
      metadata: {
        user_id: context.user.id,
        category_slug: context.category,
        plan_slug: targetPlan,
      },
      subscription_data: {
        metadata: {
          user_id: context.user.id,
          category_slug: context.category,
          plan_slug: targetPlan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout creation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create Stripe Checkout.",
      },
      { status: 502 },
    );
  }
}
