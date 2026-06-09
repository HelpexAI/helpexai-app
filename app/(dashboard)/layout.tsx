import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { getCurrentWorkspace } from "@/lib/dashboard/workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const workspace = await getCurrentWorkspace();

  return (
    <QueryProvider>
      <DashboardShell workspace={workspace}>{children}</DashboardShell>
    </QueryProvider>
  );
}
