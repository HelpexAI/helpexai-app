import { getDocumentRequestContext } from "@/lib/documents/server";
import { stripe } from "@/lib/stripe/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getDocumentRequestContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: account } = await context.service
    .from("accounts")
    .select("stripe_customer_id")
    .eq("user_id", context.user.id)
    .eq("category_slug", context.category)
    .maybeSingle();

  if (!account?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe billing account was found." }, { status: 404 });
  }

  try {
    const configurations = await stripe.billingPortal.configurations.list({ active: true, limit: 1 });
    const configuration = configurations.data[0] ?? await stripe.billingPortal.configurations.create({
      business_profile: { headline: "Manage your HelpexAI Pro subscription" },
      features: {
        customer_update: { enabled: true, allowed_updates: ["email", "address"] },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
      },
    });
    const session = await stripe.billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      configuration: configuration.id,
      return_url: `${new URL(request.url).origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe portal creation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not open Stripe billing portal." },
      { status: 502 },
    );
  }
}
