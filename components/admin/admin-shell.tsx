"use client";

import { BrandLogo } from "@/components/brand-logo";
import { BarChart3, BookOpen, BriefcaseBusiness, CreditCard, FileText, HeartPulse, LayoutDashboard, MessageSquare, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  ["Overview", "/admin", LayoutDashboard], ["Users", "/admin/users", Users],
  ["Workspaces", "/admin/workspaces", BriefcaseBusiness], ["Knowledge", "/admin/knowledge", BookOpen],
  ["Reports", "/admin/reports", FileText], ["Conversations", "/admin/conversations", MessageSquare],
  ["Usage & Cost", "/admin/usage", BarChart3], ["Health", "/admin/health", HeartPulse],
  ["Billing / Plans", "/admin/billing", CreditCard], ["Settings", "/admin/settings", Settings],
] as const;

export function AdminShell({ email, role, children }: { email: string; role: string; children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-zinc-800 bg-[#07150f] text-white lg:flex">
      <div className="border-b border-white/10 p-6"><Link href="/admin" className="flex items-center gap-3 font-bold"><BrandLogo className="size-9 rounded-lg" priority />HelpexAI Admin</Link><p className="mt-3 truncate text-xs text-white/50">{email} · {role}</p></div>
      <nav className="flex flex-1 flex-col gap-1 p-4">{items.map(([label, href, Icon]) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${active ? "bg-emerald-500 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}><Icon className="size-4" />{label}</Link>; })}</nav>
      <div className="border-t border-white/10 p-4"><Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-white/65 hover:bg-white/10">Return to customer app</Link></div>
    </aside>
    <div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-16 items-center gap-3 overflow-x-auto border-b border-zinc-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">{items.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold">{label}</Link>)}</header><main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">{children}</main></div>
  </div>;
}
