import { AdminPageHeader, AdminTable, DateCell, Pagination, SearchForm, StatusBadge } from "@/components/admin/admin-ui";
import { getTableData } from "@/lib/admin/data";

export default async function AdminWorkspacesPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const data = await getTableData("accounts", "id,user_id,category_slug,plan,subscription_status,billing_provider,created_at,updated_at", Number(params.page ?? 1), "category_slug", params.q ?? "");
  return <><AdminPageHeader title="Workspaces" description="Customer workspaces, products, plans, and billing readiness."><SearchForm value={params.q} placeholder="Search product type" /></AdminPageHeader>
    <AdminTable headers={["Workspace", "Owner ID", "Product", "Plan", "Subscription", "Provider", "Created", "Last activity"]} rows={data.rows.map((row) => [
      <span key="id" className="font-mono text-xs">{String(row.id)}</span>, <span key="u" className="font-mono text-xs">{String(row.user_id).slice(0, 12)}…</span>, String(row.category_slug),
      <StatusBadge key="p" value={String(row.plan)} />, <StatusBadge key="s" value={row.subscription_status ? String(row.subscription_status) : null} />, String(row.billing_provider ?? "none"), <DateCell key="c" value={String(row.created_at)} />, <DateCell key="d" value={String(row.updated_at)} />,
    ])} /><Pagination page={data.page} total={data.total} pageSize={data.pageSize} basePath="/admin/workspaces" query={params.q} /></>;
}
