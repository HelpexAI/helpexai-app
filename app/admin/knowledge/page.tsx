import { AdminPageHeader, AdminTable, DateCell, MetricCard, Pagination, SearchForm, StatusBadge } from "@/components/admin/admin-ui";
import { getTableData } from "@/lib/admin/data";

export default async function AdminKnowledgePage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const [sources, items, chunks, documents, failed] = await Promise.all([
    getTableData("knowledge_sources", "id,name,type,status,category_slug,user_id,created_at,updated_at", Number(params.page ?? 1), "name", params.q ?? ""),
    getTableData("knowledge_items", "id", 1),
    getTableData("knowledge_chunks", "id", 1),
    getTableData("documents", "id", 1),
    getTableData("knowledge_sources", "id", 1, "status", "failed"),
  ]);
  return <><AdminPageHeader title="Knowledge" description="Generic knowledge sources and processing health without exposing customer content."><SearchForm value={params.q} placeholder="Search source name" /></AdminPageHeader>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Sources" value={sources.total} /><MetricCard label="Knowledge items" value={items.total} /><MetricCard label="Chunks" value={chunks.total} /><MetricCard label="Documents" value={documents.total} detail={`${failed.total} failed sources`} /></section>
    <AdminTable headers={["Source", "Type", "Product", "Owner ID", "Status", "Created", "Updated"]} rows={sources.rows.map((row) => [
      <div key="n"><p className="font-semibold">{String(row.name)}</p><p className="font-mono text-xs text-zinc-500">{String(row.id).slice(0, 12)}…</p></div>, String(row.type), String(row.category_slug),
      <span key="u" className="font-mono text-xs">{String(row.user_id).slice(0, 12)}…</span>, <StatusBadge key="s" value={String(row.status)} />, <DateCell key="c" value={String(row.created_at)} />, <DateCell key="d" value={String(row.updated_at)} />,
    ])} /><Pagination page={sources.page} total={sources.total} pageSize={sources.pageSize} basePath="/admin/knowledge" query={params.q} /></>;
}
