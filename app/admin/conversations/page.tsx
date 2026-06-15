import { AdminPageHeader, AdminTable, DateCell, Pagination, SearchForm, StatusBadge } from "@/components/admin/admin-ui";
import { getTableData } from "@/lib/admin/data";

export default async function AdminConversationsPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const data = await getTableData("conversations", "id,title,user_id,category_slug,selected_document_ids,external_research_enabled,is_locked,created_at,updated_at", Number(params.page ?? 1), "title", params.q ?? "");
  return <><AdminPageHeader title="Conversations" description="Privacy-safe conversation metadata and knowledge usage."><SearchForm value={params.q} placeholder="Search title" /></AdminPageHeader>
    <AdminTable headers={["Conversation", "Workspace", "Owner ID", "Documents", "Research", "State", "Created", "Last activity"]} rows={data.rows.map((row) => [
      <div key="r"><p className="font-semibold">{String(row.title)}</p><p className="font-mono text-xs text-zinc-500">{String(row.id).slice(0, 12)}…</p></div>, String(row.category_slug),
      <span key="u" className="font-mono text-xs">{String(row.user_id).slice(0, 12)}…</span>, Array.isArray(row.selected_document_ids) ? row.selected_document_ids.length : 0, row.external_research_enabled ? "Enabled" : "Off",
      <StatusBadge key="s" value={row.is_locked ? "active" : "draft"} />, <DateCell key="c" value={String(row.created_at)} />, <DateCell key="d" value={String(row.updated_at)} />,
    ])} /><Pagination page={data.page} total={data.total} pageSize={data.pageSize} basePath="/admin/conversations" query={params.q} /></>;
}
