import { AdminPageHeader, AdminTable, DateCell, StatusBadge } from "@/components/admin/admin-ui";
import { getHealthData } from "@/lib/admin/data";

export default async function AdminHealthPage() {
  const data = await getHealthData();
  return <><AdminPageHeader title="Health" description="Safe configuration and operational health checks. No secrets are exposed." />
    <div className="space-y-3"><h2 className="font-bold">Launch readiness</h2><AdminTable headers={["Area", "Status", "Detail", "Next action"]} rows={data.readiness.map((item) => [item.area, <StatusBadge key="s" value={item.status} />, item.detail, item.action])} /></div>
    <AdminTable headers={["Service", "Status", "Detail"]} rows={data.services.map((service) => [service.name, <StatusBadge key="s" value={service.status} />, service.detail])} />
    <div className="space-y-3"><h2 className="font-bold">Recent failures</h2><AdminTable headers={["Type", "Record", "Error", "Updated"]} rows={data.failures.map((row) => [row.type, row.name, <span key="e" className="text-xs text-red-600">{row.error_message ?? "Unknown failure"}</span>, <DateCell key="d" value={row.updated_at} />])} /></div>
    <div className="space-y-3"><h2 className="font-bold">System events</h2><AdminTable headers={["Type", "Severity", "Message", "Created"]} rows={data.events.map((row) => [row.type, <StatusBadge key="s" value={row.severity} />, row.message, <DateCell key="d" value={row.created_at} />])} /></div>
  </>;
}
