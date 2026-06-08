import { reportError } from "@/lib/monitoring";
import { stripe } from "@/lib/stripe/client";
import { updateAccountFromSubscription } from "@/lib/stripe/subscriptions";
import { createServiceClient } from "@/lib/supabase/server";
import type Stripe from "stripe";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || secret.includes("your_webhook") || !signature) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature" },
      { status: 400 },
    );
  }

  const service = createServiceClient();
  try {
    const { error: claimError } = await service
      .from("stripe_events")
      .insert({ event_id: event.id, event_type: event.type });
    if (claimError?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (claimError) throw claimError;

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        if (typeof session.subscription === "string") {
          await updateAccountFromSubscription(await stripe.subscriptions.retrieve(session.subscription));
        }
      }

      if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
        await updateAccountFromSubscription(event.data.object);
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object;
        const { error } = await service
          .from("accounts")
          .update({ plan: "free", subscription_status: "cancelled" })
          .eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
      }
    } catch (error) {
      await service.from("stripe_events").delete().eq("event_id", event.id);
      throw error;
    }
  } catch (error) {
    reportError(error, { area: "stripe-webhook", eventId: event.id, eventType: event.type });
    return NextResponse.json({ error: "Webhook synchronization failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
