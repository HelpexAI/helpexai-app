import { BillingOverview } from "@/components/billing/billing-overview";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { stripe } from "@/lib/stripe/client";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { updateAccountFromSubscription } from "@/lib/stripe/subscriptions";
import { startOfTodayUtc } from "@/lib/usage/daily";
import { normalizePlanSlug } from "@/lib/stripe/plans";
import { getProductPlan, getProductPlans } from "@/lib/plans/catalog";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const service = createServiceClient();

  if (resolvedSearchParams.checkout === "success" && resolvedSearchParams.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(resolvedSearchParams.session_id);
      if (session.client_reference_id === workspace.userId && typeof session.subscription === "string") {
        await updateAccountFromSubscription(await stripe.subscriptions.retrieve(session.subscription));
      }
    } catch (error) {
      console.warn("Stripe checkout return sync skipped:", error);
    }
  }

  const [accountResult, questionsResult] = await Promise.all([
    service
      .from("accounts")
      .select("plan, stripe_customer_id, subscription_status")
      .eq("user_id", workspace.userId)
      .eq("category_slug", workspace.category)
      .maybeSingle(),
    supabase
      .from("usage_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", workspace.userId)
      .eq("category_slug", workspace.category)
      .eq("action", "query")
      .gte("created_at", startOfTodayUtc()),
  ]);
  const account = accountResult.data;
  const currentPlan = normalizePlanSlug(account?.plan);
  const [limits, plans] = await Promise.all([
    getProductPlan(service, workspace.category, currentPlan),
    getProductPlans(service, workspace.category),
  ]);

  const invoices = [];
  if (account?.stripe_customer_id) {
    try {
      const result = await stripe.invoices.list({ customer: account.stripe_customer_id, limit: 12 });
      for (const invoice of result.data) {
        invoices.push({
          id: invoice.id,
          date: new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(invoice.created * 1000)),
          amount: new Intl.NumberFormat("en-US", { style: "currency", currency: invoice.currency.toUpperCase() }).format(invoice.amount_paid / 100),
          status: invoice.status ?? "open",
          url: invoice.invoice_pdf ?? null,
        });
      }
    } catch (error) {
      console.warn("Stripe invoice history unavailable:", error);
    }
  }

  return (
    <BillingOverview
      plan={currentPlan}
      subscriptionStatus={account?.subscription_status ?? null}
      notice={resolvedSearchParams.checkout === "success" ? "success" : resolvedSearchParams.checkout === "cancelled" ? "cancelled" : undefined}
      usage={[
        { label: "Documents", current: workspace.documentsUsed, limit: limits.max_documents },
        { label: "Questions Today", current: questionsResult.count ?? 0, limit: limits.max_queries_day },
      ]}
      invoices={invoices}
      plans={plans}
    />
  );
}
