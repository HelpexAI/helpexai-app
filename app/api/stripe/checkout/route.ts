import { getDocumentRequestContext } from "@/lib/documents/server";
import { stripe } from "@/lib/stripe/client";
import { mockStripeEnabled, validStripePriceId } from "@/lib/stripe/subscriptions";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (context.plan === "pro") {
    return NextResponse.json({ error: "You are already on the Pro plan." }, { status: 400 });
  }

  const { data: account } = await context.service
    .from("accounts")
    .select("id, stripe_customer_id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();
  const { data: plan } = await context.service
    .from("plans")
    .select("stripe_price_id")
    .eq("slug", "pro")
    .eq("category_slug", context.category)
    .maybeSingle();

  const envPrice =
    context.category === "business"
      ? process.env.STRIPE_BUSINESS_PRO_PRICE_ID
      : process.env.STRIPE_LEGAL_PRO_PRICE_ID;
  const priceId = validStripePriceId(plan?.stripe_price_id)
    ? plan!.stripe_price_id
    : validStripePriceId(envPrice)
      ? envPrice
      : null;

  if (!priceId) {
    if (mockStripeEnabled()) {
      return NextResponse.json({ url: `${new URL(request.url).origin}/billing/mock-checkout` });
    }
    return NextResponse.json(
      { error: "Stripe Pro price is not configured yet. Add a real Pro price ID in Stripe settings." },
      { status: 503 },
    );
  }

  if (!account) {
    return NextResponse.json({ error: "Billing account was not found." }, { status: 404 });
  }

  let customerId = account.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: context.user.email,
      metadata: { user_id: context.user.id, category_slug: context.category },
    });
    customerId = customer.id;
    await context.service
      .from("accounts")
      .update({ stripe_customer_id: customerId })
      .eq("id", account.id);
  }

  const origin = new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: context.user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    success_url: `${origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/billing?checkout=cancelled`,
    metadata: { user_id: context.user.id, category_slug: context.category },
    subscription_data: {
      metadata: { user_id: context.user.id, category_slug: context.category },
    },
  });

  return NextResponse.json({ url: session.url });
}
