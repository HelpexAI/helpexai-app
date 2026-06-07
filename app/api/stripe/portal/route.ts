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

  const session = await stripe.billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${new URL(request.url).origin}/billing`,
  });
  return NextResponse.json({ url: session.url });
}

