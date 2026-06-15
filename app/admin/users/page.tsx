import { AdminPageHeader, AdminTable, Bytes, DateCell, Pagination, SearchForm, StatusBadge } from "@/components/admin/admin-ui";
import { getUsersData } from "@/lib/admin/data";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const params = await searchParams;
  const data = await getUsersData(Number(params.page ?? 1), params.q ?? "");
  return <>
    <AdminPageHeader title="Users" description="Registered users and their aggregate platform activity."><SearchForm value={params.q} placeholder="Search name or email" /></AdminPageHeader>
    <AdminTable headers={["User", "Role", "Workspaces / plan", "Documents", "Reports", "Conversations", "Storage", "Last active"]} rows={data.users.map((user) => [
      <div key="u"><p className="font-semibold">{user.name}</p><p className="text-xs text-zinc-500">{user.email}</p></div>,
      <StatusBadge key="r" value={String(user.role)} />,
      <div key="w" className="text-xs">{user.workspaces.length ? user.workspaces.map((workspace) => <p key={String(workspace.category_slug)}>{String(workspace.category_slug)}: {String(workspace.plan)}</p>) : "—"}</div>,
      user.documents, user.reports, user.conversations, <Bytes key="b" value={user.storage} />, <DateCell key="d" value={user.last_active_at} />,
    ])} />
    <Pagination page={data.page} total={data.total} pageSize={data.pageSize} basePath="/admin/users" query={params.q} />
  </>;
}
