import { createServiceClient } from "@/lib/supabase/server";
import { normalizePlanSlug } from "@/lib/stripe/plans";
import type { CategorySlug, PlanSlug, SubscriptionStatus } from "@/types";
import type Stripe from "stripe";

export function validStripePriceId(value: string | null | undefined) {
  return Boolean(value?.startsWith("price_") && !value.includes("XXXX") && !value.includes("YYYY") && !value.includes("_id_here"));
}

export function subscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === "active") return "active";
  if (status === "trialing") return "trialing";
  if (status === "past_due" || status === "unpaid" || status === "incomplete") return "past_due";
  return "cancelled";
}

function planFromPriceId(priceId: string | undefined): PlanSlug {
  const premiumPrices = [
    process.env.STRIPE_LEGAL_PREMIUM_PRICE_ID,
    process.env.STRIPE_BUSINESS_PREMIUM_PRICE_ID,
  ];
  const proPrices = [
    process.env.STRIPE_LEGAL_PRO_PRICE_ID,
    process.env.STRIPE_BUSINESS_PRO_PRICE_ID,
  ];
  if (priceId && premiumPrices.includes(priceId)) return "premium";
  if (priceId && proPrices.includes(priceId)) return "pro";
  return "free";
}

export async function updateAccountFromSubscription(subscription: Stripe.Subscription) {
  const service = createServiceClient();
  const userId = subscription.metadata.user_id;
  const category = subscription.metadata.category_slug as CategorySlug | undefined;
  if (!userId || !category) return;

  const status = subscriptionStatus(subscription.status);
  const active = status === "active" || status === "trialing";
  const metadataPlan = normalizePlanSlug(subscription.metadata.plan_slug);
  const pricePlan = planFromPriceId(subscription.items.data[0]?.price.id);
  const paidPlan = metadataPlan !== "free" ? metadataPlan : pricePlan;
  const { error } = await service
    .from("accounts")
    .update({
      plan: active && paidPlan !== "free" ? paidPlan : "free",
      stripe_customer_id:
        typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      subscription_status: status,
    })
    .eq("user_id", userId)
    .eq("category_slug", category);
  if (error) throw error;
}
