import { AdminPageHeader, AdminTable, Bytes, DateCell, MetricCard, MoneyMicros, StatusBadge } from "@/components/admin/admin-ui";
import { getOverviewData } from "@/lib/admin/data";

export default async function AdminOverviewPage() {
  const data = await getOverviewData();
  const m = data.metrics;
  return <>
    <AdminPageHeader title="Platform Overview" description="Operational visibility across users, workspaces, knowledge, AI activity, and failures." />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total users" value={m.users} />
      <MetricCard label="Workspaces" value={m.workspaces} detail={`${m.activeWorkspaces} active this month`} />
      <MetricCard label="Knowledge sources" value={m.sources} detail={`${m.items} knowledge items`} />
      <MetricCard label="Documents" value={m.documents} />
      <MetricCard label="Reports" value={m.reports} detail={`${m.reportsToday} generated today`} />
      <MetricCard label="Conversations" value={m.conversations} detail={`${m.messages} total messages`} />
      <MetricCard label="Storage used" value={<Bytes value={m.storageBytes} />} />
      <MetricCard label="Estimated AI cost this month" value={<MoneyMicros value={m.costMicros} />} detail={`${m.failures} known failures`} />
    </section>
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-3"><h2 className="font-bold">Recent reports</h2><AdminTable headers={["Report", "Workspace", "Status", "Created"]} rows={data.recentReports.map((row) => [row.title, row.category_slug, <StatusBadge key="s" value={row.status} />, <DateCell key="d" value={row.created_at} />])} /></div>
      <div className="space-y-3"><h2 className="font-bold">Recently active workspaces</h2><AdminTable headers={["Workspace ID", "Product", "Plan", "Last activity"]} rows={data.recentWorkspaces.map((row) => [<span key="id" className="font-mono text-xs">{row.id.slice(0, 8)}…</span>, row.category_slug, <StatusBadge key="p" value={row.plan} />, <DateCell key="d" value={row.updated_at} />])} /></div>
    </section>
  </>;
}
