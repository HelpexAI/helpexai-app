import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getCurrentWorkspace();

  return <DashboardShell workspace={workspace}>{children}</DashboardShell>;
}
