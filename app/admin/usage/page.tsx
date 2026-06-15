import { AdminPageHeader, AdminTable, DateCell, MoneyMicros, Pagination, SearchForm, StatusBadge } from "@/components/admin/admin-ui";
import { getTableData } from "@/lib/admin/data";

export default async function AdminUsagePage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const data = await getTableData("usage_logs", "id,user_id,category_slug,action,feature,model,tokens_used,input_tokens,output_tokens,estimated_cost_micros,status,duration_ms,error_message,created_at", Number(params.page ?? 1), "feature", params.q ?? "");
  return <><AdminPageHeader title="Usage & Cost" description="AI and feature usage. Cost fields become richer as calls adopt operational logging."><SearchForm value={params.q} placeholder="Search feature" /></AdminPageHeader>
    <AdminTable headers={["Time", "Feature", "Workspace", "User ID", "Model", "Tokens", "Cost", "Status", "Duration"]} rows={data.rows.map((row) => [
      <DateCell key="d" value={String(row.created_at)} />, String(row.feature ?? row.action), String(row.category_slug), <span key="u" className="font-mono text-xs">{String(row.user_id).slice(0, 12)}…</span>,
      String(row.model ?? "—"), Number(row.input_tokens ?? 0) + Number(row.output_tokens ?? 0) || Number(row.tokens_used ?? 0), <MoneyMicros key="m" value={Number(row.estimated_cost_micros ?? 0)} />, <StatusBadge key="s" value={String(row.status)} />, row.duration_ms ? `${Number(row.duration_ms)}ms` : "—",
    ])} /><Pagination page={data.page} total={data.total} pageSize={data.pageSize} basePath="/admin/usage" query={params.q} /></>;
}
