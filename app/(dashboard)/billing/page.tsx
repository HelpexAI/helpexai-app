// app/billing/page.tsx

import { BillingOverview } from "@/components/billing/billing-overview";
import { listCreemCustomerTransactions } from "@/lib/creem/client";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import { getProductPlan, getProductPlans } from "@/lib/plans/catalog";
import { normalizePlanSlug } from "@/lib/stripe/plans";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { startOfTodayUtc } from "@/lib/usage/daily";

export const dynamic = "force-dynamic";

function formatCreemDate(value?: number | string) {
  if (!value) return "Unknown";

  const date =
    typeof value === "number"
      ? new Date(value > 10_000_000_000 ? value : value * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatCreemAmount(amount?: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format((amount ?? 0) / 100);
}

function getTransactionStatus(amountPaid: number, refundedAmount: number) {
  if (refundedAmount > 0 && refundedAmount >= amountPaid) return "refunded";
  if (refundedAmount > 0) return "partially refunded";
  if (amountPaid > 0) return "paid";
  return "open";
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const service = createServiceClient();

  const [accountResult, questionsResult] = await Promise.all([
    service
      .from("accounts")
      .select("plan, creem_customer_id, subscription_status")
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

  const invoices: {
    id: string;
    date: string;
    amount: string;
    status: string;
    url: string | null;
  }[] = [];

  if (account?.creem_customer_id) {
    try {
      const [transactionsResult] = await Promise.all([
        listCreemCustomerTransactions(account.creem_customer_id),
      ]);

      const transactions =
        transactionsResult.items ?? transactionsResult.data ?? [];

      for (const transaction of transactions) {
        const amountPaid = transaction.amount_paid ?? transaction.amount ?? 0;
        const refundedAmount = transaction.refunded_amount ?? 0;

        invoices.push({
          id: transaction.id,
          date: formatCreemDate(transaction.created_at),
          amount: formatCreemAmount(amountPaid, transaction.currency ?? "USD"),
          status: getTransactionStatus(amountPaid, refundedAmount),

          // Creem does not return Stripe-style invoice_pdf here.
          // This opens Creem customer portal instead.
          url: `/api/billing/invoices/${transaction.id}`,
        });
      }
    } catch (error) {
      console.warn("Creem payment history unavailable:", error);
    }
  }

  return (
    <BillingOverview
      plan={currentPlan}
      subscriptionStatus={account?.subscription_status ?? null}
      notice={
        resolvedSearchParams.checkout === "success"
          ? "success"
          : resolvedSearchParams.checkout === "cancelled"
            ? "cancelled"
            : undefined
      }
      usage={[
        {
          label: "Documents",
          current: workspace.documentsUsed,
          limit: limits.max_documents,
        },
        {
          label: "Questions Today",
          current: questionsResult.count ?? 0,
          limit: limits.max_queries_day,
        },
      ]}
      invoices={invoices}
      plans={plans}
    />
  );
}
