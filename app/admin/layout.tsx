import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminUser } from "@/lib/admin/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "HelpexAI Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role } = await requireAdminUser();
  return <AdminShell email={user.email ?? "Admin"} role={role}>{children}</AdminShell>;
}

