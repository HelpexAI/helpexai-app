import { AdminPageHeader, AdminTable, Bytes, DateCell, MetricCard, StatusBadge } from "@/components/admin/admin-ui";
import { getBillingData } from "@/lib/admin/data";

export default async function AdminBillingPage() {
  const data = await getBillingData();
  const counts = (slug: string) => data.accounts.filter((account) => account.plan === slug).length;
  return <><AdminPageHeader title="Billing / Plans" description="Configured plans, limits, subscriptions, and billing readiness." />
    <section className="grid gap-4 sm:grid-cols-3"><MetricCard label="Free workspaces" value={counts("free")} /><MetricCard label="Pro workspaces" value={counts("pro")} /><MetricCard label="Premium workspaces" value={counts("premium")} /></section>
    <div className="space-y-3"><h2 className="font-bold">Plans</h2><AdminTable headers={["Plan", "Product", "Price", "Storage", "Queries/day", "Reports/month", "Creem"]} rows={data.plans.map((plan) => [
      plan.name, plan.category_slug, `$${(plan.price_monthly / 100).toFixed(2)}`, <Bytes key="b" value={Number(plan.max_storage_bytes ?? 0)} />, plan.max_queries_day < 0 ? "Unlimited" : plan.max_queries_day, plan.max_reports_month, <StatusBadge key="s" value={plan.creem_product_id ? "configured" : "not configured"} />,
    ])} /></div>
    <div className="space-y-3"><h2 className="font-bold">Workspace subscriptions</h2><AdminTable headers={["Workspace", "Product", "Plan", "Status", "Provider", "Created"]} rows={data.accounts.slice(0, 50).map((account) => [
      <span key="id" className="font-mono text-xs">{account.id}</span>, account.category_slug, <StatusBadge key="p" value={account.plan} />, <StatusBadge key="s" value={account.subscription_status} />, account.billing_provider ?? "none", <DateCell key="d" value={account.created_at} />,
    ])} /></div>
  </>;
}
