import { BillingOverview } from "@/components/billing/billing-overview";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { stripe } from "@/lib/stripe/client";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { updateAccountFromSubscription } from "@/lib/stripe/subscriptions";
import { startOfTodayUtc } from "@/lib/usage/daily";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { checkout?: string; session_id?: string };
}) {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const service = createServiceClient();

  if (searchParams.checkout === "success" && searchParams.session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(searchParams.session_id);
      if (session.client_reference_id === workspace.userId && typeof session.subscription === "string") {
        await updateAccountFromSubscription(await stripe.subscriptions.retrieve(session.subscription));
      }
    } catch (error) {
      console.warn("Stripe checkout return sync skipped:", error);
    }
  }

  const { data: account } = await service
    .from("accounts")
    .select("plan, stripe_customer_id, subscription_status")
    .eq("user_id", workspace.userId)
    .eq("category_slug", workspace.category)
    .maybeSingle();
  const currentPlan = account?.plan === "pro" ? "pro" : "free";
  const [planResult, documentsResult, questionsResult] = await Promise.all([
    supabase.from("plans").select("max_documents, max_queries_day").eq("slug", currentPlan).eq("category_slug", workspace.category).maybeSingle(),
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("user_id", workspace.userId).eq("category_slug", workspace.category),
    supabase.from("usage_logs").select("*", { count: "exact", head: true }).eq("user_id", workspace.userId).eq("category_slug", workspace.category).eq("action", "query").gte("created_at", startOfTodayUtc()),
  ]);
  const limits = planResult.data ?? {
    max_documents: currentPlan === "pro" ? 50 : 1,
    max_queries_day: currentPlan === "pro" ? 50 : 3,
  };

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
      notice={searchParams.checkout === "success" ? "success" : searchParams.checkout === "cancelled" ? "cancelled" : undefined}
      usage={[
        { label: "Documents", current: documentsResult.count ?? 0, limit: limits.max_documents },
        { label: "Questions Today", current: questionsResult.count ?? 0, limit: limits.max_queries_day },
      ]}
      invoices={invoices}
    />
  );
}
