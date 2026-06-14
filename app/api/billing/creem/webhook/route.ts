// app/api/webhooks/creem/route.ts

import { reportError } from "@/lib/monitoring";
import { createServiceClient } from "@/lib/supabase/server";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CreemEvent = {
  id: string;
  eventType?: string;
  type?: string;
  created_at?: number;
  object?: CreemObject;
};

type CreemObject = {
  object?: string;
  id?: string;
  request_id?: string;
  metadata?: Record<string, string>;
  subscription?: CreemObject | string;
  customer?: { id?: string } | string;
  product?: { id?: string } | string;
  order?: { customer?: string; product?: string };
  current_period_end_date?: string;
  [key: string]: unknown;
};

function verifyCreemSignature({
  body,
  signature,
  secret,
}: {
  body: string;
  signature: string | null;
  secret: string;
}) {
  if (!signature) return false;

  const receivedSignature = signature
    .replace(/^sha256=/, "")
    .replace(/\s/g, "")
    .trim();

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  const received = Buffer.from(receivedSignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
}

function getEventType(event: CreemEvent) {
  return event.eventType ?? event.type ?? "unknown";
}

function getSubscription(event: CreemEvent) {
  const object = event.object;

  if (!object) return null;

  if (object.object === "subscription") {
    return object;
  }

  if (object.subscription && typeof object.subscription === "object") {
    return object.subscription;
  }

  return null;
}

function getMetadata(event: CreemEvent) {
  const object = event.object;
  const subscription = getSubscription(event);

  return {
    ...(object?.metadata ?? {}),
    ...(subscription?.metadata ?? {}),
  };
}

function getAccountId(event: CreemEvent) {
  const object = event.object;
  const metadata = getMetadata(event);

  return metadata.account_id ?? object?.request_id ?? null;
}

function getUserId(event: CreemEvent) {
  return getMetadata(event).user_id ?? null;
}

function getCategorySlug(event: CreemEvent) {
  return getMetadata(event).category_slug ?? null;
}

function getPlanSlugFromMetadata(event: CreemEvent) {
  return getMetadata(event).plan_slug ?? null;
}

function getCustomerId(event: CreemEvent) {
  const object = event.object;
  const subscription = getSubscription(event);

  if (typeof subscription?.customer === "string") return subscription.customer;
  if (subscription?.customer?.id) return subscription.customer.id;

  if (typeof object?.customer === "string") return object.customer;
  if (object?.customer?.id) return object.customer.id;

  if (object?.order?.customer) return object.order.customer;

  return null;
}

function getSubscriptionId(event: CreemEvent) {
  const object = event.object;
  const subscription = getSubscription(event);

  if (subscription?.id) return subscription.id;

  if (typeof object?.subscription === "string") {
    return object.subscription;
  }

  return null;
}

function getProductId(event: CreemEvent) {
  const object = event.object;
  const subscription = getSubscription(event);

  if (typeof subscription?.product === "string") return subscription.product;
  if (subscription?.product?.id) return subscription.product.id;

  if (typeof object?.product === "string") return object.product;
  if (object?.product?.id) return object.product.id;

  if (object?.order?.product) return object.order.product;

  return null;
}

function getCurrentPeriodEnd(event: CreemEvent) {
  const subscription = getSubscription(event);

  return subscription?.current_period_end_date ?? null;
}

async function resolveAccount(
  service: ReturnType<typeof createServiceClient>,
  event: CreemEvent,
) {
  const accountId = getAccountId(event);
  const userId = getUserId(event);
  const categorySlug = getCategorySlug(event);
  const creemSubscriptionId = getSubscriptionId(event);
  const creemCustomerId = getCustomerId(event);

  if (accountId) {
    const { data, error } = await service
      .from("accounts")
      .select("id, user_id, category_slug")
      .eq("id", accountId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (creemSubscriptionId) {
    const { data, error } = await service
      .from("accounts")
      .select("id, user_id, category_slug")
      .eq("creem_subscription_id", creemSubscriptionId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (userId && categorySlug) {
    const { data, error } = await service
      .from("accounts")
      .select("id, user_id, category_slug")
      .eq("user_id", userId)
      .eq("category_slug", categorySlug)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (creemCustomerId && categorySlug) {
    const { data, error } = await service
      .from("accounts")
      .select("id, user_id, category_slug")
      .eq("creem_customer_id", creemCustomerId)
      .eq("category_slug", categorySlug)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

async function resolvePlan(
  service: ReturnType<typeof createServiceClient>,
  event: CreemEvent,
  categorySlug: string,
) {
  const planFromMetadata = getPlanSlugFromMetadata(event);
  if (planFromMetadata) return planFromMetadata;

  const productId = getProductId(event);
  if (!productId) return null;

  const { data, error } = await service
    .from("plans")
    .select("slug")
    .eq("creem_product_id", productId)
    .eq("category_slug", categorySlug)
    .maybeSingle();

  if (error) throw error;

  return data?.slug ?? null;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  if (typeof error === "object" && error !== null) {
    return JSON.parse(JSON.stringify(error));
  }

  return {
    message: String(error),
  };
}

async function syncPaidSubscription(
  service: ReturnType<typeof createServiceClient>,
  event: CreemEvent,
) {
  const account = await resolveAccount(service, event);

  if (!account) {
    console.warn("Creem account not found for paid subscription", {
      eventId: event.id,
      eventType: getEventType(event),
      accountId: getAccountId(event),
      userId: getUserId(event),
      categorySlug: getCategorySlug(event),
      creemCustomerId: getCustomerId(event),
      creemSubscriptionId: getSubscriptionId(event),
    });

    return;
  }

  const plan = await resolvePlan(service, event, account.category_slug);

  if (!plan) {
    console.warn("Creem plan not resolved", {
      eventId: event.id,
      eventType: getEventType(event),
      productId: getProductId(event),
      categorySlug: account.category_slug,
    });

    return;
  }

  const { error } = await service
    .from("accounts")
    .update({
      plan,
      billing_provider: "creem",
      subscription_status: "active",
      creem_customer_id: getCustomerId(event),
      creem_subscription_id: getSubscriptionId(event),
      creem_current_period_end: getCurrentPeriodEnd(event),
    })
    .eq("id", account.id);

  if (error) throw error;
}

async function syncSubscriptionStatus(
  service: ReturnType<typeof createServiceClient>,
  event: CreemEvent,
  status: string,
) {
  const account = await resolveAccount(service, event);

  if (!account) {
    console.warn("Creem account not found for status sync", {
      eventId: event.id,
      eventType: getEventType(event),
      status,
      accountId: getAccountId(event),
      userId: getUserId(event),
      categorySlug: getCategorySlug(event),
      creemCustomerId: getCustomerId(event),
      creemSubscriptionId: getSubscriptionId(event),
    });

    return;
  }

  const { error } = await service
    .from("accounts")
    .update({
      billing_provider: "creem",
      subscription_status: status,
      creem_customer_id: getCustomerId(event),
      creem_subscription_id: getSubscriptionId(event),
      creem_current_period_end: getCurrentPeriodEnd(event),
    })
    .eq("id", account.id);

  if (error) throw error;
}

async function downgradeToFree(
  service: ReturnType<typeof createServiceClient>,
  event: CreemEvent,
  status: string,
) {
  const account = await resolveAccount(service, event);

  if (!account) {
    console.warn("Creem account not found for downgrade", {
      eventId: event.id,
      eventType: getEventType(event),
      status,
      accountId: getAccountId(event),
      userId: getUserId(event),
      categorySlug: getCategorySlug(event),
      creemCustomerId: getCustomerId(event),
      creemSubscriptionId: getSubscriptionId(event),
    });

    return;
  }

  const { error } = await service
    .from("accounts")
    .update({
      plan: "free",
      billing_provider: "creem",
      subscription_status: status,
      creem_customer_id: getCustomerId(event),
      creem_subscription_id: null,
      creem_current_period_end: null,
    })
    .eq("id", account.id);

  if (error) throw error;
}

export async function POST(request: Request) {
  console.log("Received Creem webhook", request.url);
  const secret = process.env.CREEM_WEBHOOK_SECRET;

  const body = await request.text();
  const shouldBypassSignature = process.env.CREEM_WEBHOOK_DEV_BYPASS === "true";
  if (!shouldBypassSignature) {
    const signature = request.headers.get("creem-signature");

    if (!secret || secret.includes("your_webhook") || !signature) {
      return NextResponse.json(
        { error: "Creem webhook is not configured." },
        { status: 400 },
      );
    }
    const validSignature = verifyCreemSignature({
      body,
      signature,
      secret,
    });

    if (!validSignature) {
      return NextResponse.json(
        { error: "Invalid Creem webhook signature." },
        { status: 400 },
      );
    }
  }

  let event: CreemEvent;

  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "Invalid Creem webhook payload." },
      { status: 400 },
    );
  }

  const eventType = getEventType(event);
  const service = createServiceClient();
  console.log(eventType, "Creem webhook event received:");

  try {
    const { error: claimError } = await service.from("creem_events").insert({
      event_id: event.id,
      event_type: eventType,
    });

    if (claimError?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }

    if (claimError) throw claimError;

    try {
      if (
        eventType === "subscription.active" ||
        eventType === "subscription.paid" ||
        eventType === "subscription.trialing" ||
        eventType === "subscription.update" ||
        eventType === "checkout.completed"
      ) {
        await syncPaidSubscription(service, event);
      }

      if (eventType === "subscription.past_due") {
        await syncSubscriptionStatus(service, event, "past_due");
      }
      if (
        eventType === "subscription.canceled" ||
        eventType === "subscription.scheduled_cancel" ||
        eventType === "subscription.expired" ||
        eventType === "subscription.unpaid" ||
        eventType === "subscription.paused" ||
        eventType === "refund.created" ||
        eventType === "dispute.created"
      ) {
        await downgradeToFree(service, event, "cancelled");
      }
    } catch (error) {
      await service.from("creem_events").delete().eq("event_id", event.id);
      throw error;
    }
  } catch (error) {
    console.error("Creem webhook synchronization failed:", {
      eventId: event.id,
      eventType,
      error: serializeError(error),
    });

    reportError(serializeError(error), {
      area: "creem-webhook",
      eventId: event.id,
      eventType,
    });

    return NextResponse.json(
      { error: "Webhook synchronization failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
