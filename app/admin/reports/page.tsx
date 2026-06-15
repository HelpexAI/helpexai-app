import { AdminPageHeader, AdminTable, DateCell, Pagination, SearchForm, StatusBadge } from "@/components/admin/admin-ui";
import { getTableData } from "@/lib/admin/data";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const data = await getTableData("reports", "id,title,template_slug,status,category_slug,user_id,model,error_message,created_at,updated_at,generated_at", Number(params.page ?? 1), "title", params.q ?? "");
  return <><AdminPageHeader title="Reports" description="Report generation, lifecycle status, models, and failures."><SearchForm value={params.q} placeholder="Search report title" /></AdminPageHeader>
    <AdminTable headers={["Report", "Type", "Workspace", "Status", "Model", "Created", "Updated", "Error"]} rows={data.rows.map((row) => [
      <div key="r"><p className="font-semibold">{String(row.title)}</p><p className="font-mono text-xs text-zinc-500">{String(row.id).slice(0, 12)}…</p></div>, String(row.template_slug ?? "custom"), String(row.category_slug),
      <StatusBadge key="s" value={String(row.status)} />, String(row.model ?? "—"), <DateCell key="c" value={String(row.created_at)} />, <DateCell key="u" value={String(row.updated_at)} />, <span key="e" className="max-w-xs text-xs text-red-600">{String(row.error_message ?? "—")}</span>,
    ])} /><Pagination page={data.page} total={data.total} pageSize={data.pageSize} basePath="/admin/reports" query={params.q} /></>;
}
