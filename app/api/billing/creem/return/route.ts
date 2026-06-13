import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectWithError(origin: string, error: string) {
  console.error("Creem return failed:", error);

  return NextResponse.redirect(
    `${origin}/billing?checkout=cancelled&error=${error}`,
  );
}

function verifyCreemRedirectSignature(requestUrl: string) {
  const apiKey = process.env.CREEM_API_KEY;

  if (!apiKey) {
    throw new Error("CREEM_API_KEY is not configured.");
  }

  const url = new URL(requestUrl);
  const signature = url.searchParams.get("signature");

  if (!signature) return false;

  /**
   * Important:
   * Do NOT sort params.
   * Creem signs the params in the same order they appear in the redirect URL.
   */
  const payload = Array.from(url.searchParams.entries())
    .filter(([key, value]) => key !== "signature" && Boolean(value))
    .map(([key, value]) => `${key}=${value}`)
    .concat(`salt=${apiKey}`)
    .join("|");

  const expectedSignature = crypto
    .createHash("sha256")
    .update(payload)
    .digest("hex");

  const matched = signature === expectedSignature;

  console.log("Creem signature verified:", matched);

  if (!matched) {
    console.error("Creem signature mismatch:", {
      receivedLength: signature.length,
      expectedLength: expectedSignature.length,
    });
  }

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;

  const checkoutId = url.searchParams.get("checkout_id");
  const orderId = url.searchParams.get("order_id");
  const customerId = url.searchParams.get("customer_id");
  const subscriptionId = url.searchParams.get("subscription_id");
  const productId = url.searchParams.get("product_id");
  const requestId = url.searchParams.get("request_id");

  console.log("Creem return params:", {
    checkoutId,
    orderId,
    customerId,
    subscriptionId,
    productId,
    requestId,
  });

  if (!checkoutId) return redirectWithError(origin, "missing_checkout_id");
  if (!customerId) return redirectWithError(origin, "missing_customer_id");
  if (!productId) return redirectWithError(origin, "missing_product_id");
  if (!requestId) return redirectWithError(origin, "missing_request_id");

  let validSignature = false;

  try {
    validSignature = verifyCreemRedirectSignature(request.url);
  } catch (error) {
    console.error("Creem signature verification failed:", error);
    return redirectWithError(origin, "signature_verification_failed");
  }

  if (!validSignature) {
    return redirectWithError(origin, "invalid_creem_signature");
  }

  const service = createServiceClient();

  const { data: account, error: accountError } = await service
    .from("accounts")
    .select("id, category_slug")
    .eq("id", requestId)
    .maybeSingle();

  console.log("Creem return account lookup:", {
    requestId,
    account,
    accountError,
  });

  if (accountError) {
    return redirectWithError(origin, "account_query_failed");
  }

  if (!account) {
    return redirectWithError(origin, "account_not_found");
  }

  const { data: plan, error: planError } = await service
    .from("plans")
    .select("slug, creem_product_id, category_slug")
    .eq("creem_product_id", productId)
    .eq("category_slug", account.category_slug)
    .maybeSingle();

  console.log("Creem return plan lookup:", {
    productId,
    categorySlug: account.category_slug,
    plan,
    planError,
  });

  if (planError) {
    return redirectWithError(origin, "plan_query_failed");
  }

  if (!plan?.slug) {
    return redirectWithError(origin, "plan_not_found");
  }

  const updatePayload: Record<string, string | null> = {
    plan: plan.slug,
    billing_provider: "creem",
    subscription_status: "active",
    creem_customer_id: customerId,
  };

  /**
   * Creem may not send subscription_id in the success redirect.
   * That is okay. Webhook can fill it later.
   */
  if (subscriptionId) {
    updatePayload.creem_subscription_id = subscriptionId;
  }

  console.log("Creem return update payload:", updatePayload);

  const { error: updateError } = await service
    .from("accounts")
    .update(updatePayload)
    .eq("id", account.id);

  if (updateError) {
    console.error("Creem return account update failed:", updateError);
    return redirectWithError(origin, "account_update_failed");
  }

  console.log("Creem return success:", {
    accountId: account.id,
    plan: plan.slug,
    customerId,
    subscriptionId,
  });

  return NextResponse.redirect(`${origin}/billing?checkout=success`);
}
