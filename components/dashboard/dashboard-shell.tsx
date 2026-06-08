"use client";

import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import type { CurrentWorkspace } from "@/lib/dashboard/workspace";
import { dashboardTheme, themeStyle } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageSquare,
  Scale,
  Settings,
  User,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Conversations", href: "/conversations", icon: MessageSquare },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

function routeIsActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  workspace,
  children,
}: {
  workspace: CurrentWorkspace;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(localStorage.getItem("helpex-sidebar-collapsed") === "true");
  }, []);

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setAccountMenuOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function toggleSidebar() {
    const nextCollapsed = !collapsed;
    setCollapsed(nextCollapsed);
    localStorage.setItem("helpex-sidebar-collapsed", String(nextCollapsed));
  }

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const current =
    navigation.find((item) => routeIsActive(pathname, item.href)) ??
    navigation[0];
  const documentViewerOpen = /^\/documents\/[^/]+$/.test(pathname);
  const activeConversationOpen = /^\/conversations\/[^/]+$/.test(pathname);
  const immersivePageOpen = documentViewerOpen || activeConversationOpen;
  const business = workspace.category === "business";
  const CategoryIcon = business ? Briefcase : Scale;

  return (
    <div
      className="min-h-screen bg-slate-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
      style={themeStyle(dashboardTheme(workspace.category))}
    >
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col bg-[#0a1628] text-white transition-[width] duration-300 lg:flex ${
          collapsed ? "w-[76px]" : "w-60"
        }`}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-7 z-10 flex size-7 items-center justify-center rounded-full border border-white/15 bg-[#12233c] text-slate-300 shadow-md transition hover:bg-[#1a3153] hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>

        <div
          className={`border-b border-white/10 transition-[padding] duration-300 ${
            collapsed ? "p-5" : "p-6"
          }`}
        >
          <Link
            href="/dashboard"
            className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}
          >
            <div className="flex size-9 items-center justify-center rounded-lg bg-theme-primary">
              <CategoryIcon className="size-4.5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tight">HelpexAI</span>
            )}
          </Link>
          {!collapsed && (
            <span className="mt-4 inline-flex rounded-full border border-theme-primary/30 bg-theme-primary/15 px-2.5 py-1 text-xs font-semibold text-theme-soft-foreground-dark">
              Helpex {business ? "Business" : "Legal"}
            </span>
          )}
        </div>

        <nav
          className={`flex flex-1 flex-col gap-1 transition-[padding] duration-300 ${
            collapsed ? "px-3 py-4" : "p-4"
          }`}
        >
          {navigation.map(({ label, href, icon: Icon }) => {
            const active = routeIsActive(pathname, href);
            const conversationsLocked = href === "/conversations" && workspace.documentsOverLimit;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                aria-disabled={conversationsLocked}
                onClick={(event) => {
                  if (conversationsLocked) event.preventDefault();
                }}
                className={`flex items-center rounded-lg py-2.5 text-sm transition-colors ${
                  collapsed ? "justify-center px-2" : "gap-3 px-3"
                } ${
                  active
                    ? "bg-theme-primary font-semibold text-white shadow-sm shadow-black/30"
                    : conversationsLocked
                      ? "cursor-not-allowed font-medium text-slate-500"
                    : "font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {!collapsed && label}
              </Link>
            );
          })}
        </nav>

        <div
          ref={accountMenuRef}
          className={`relative border-t border-white/10 transition-[padding] duration-300 ${
            collapsed ? "p-3" : "p-4"
          }`}
        >
          {accountMenuOpen && (
            <div
              className={`absolute bottom-[calc(100%-0.25rem)] z-50 overflow-hidden rounded-xl border border-zinc-200 bg-white text-zinc-950 shadow-xl shadow-black/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white ${
                collapsed ? "left-3 w-56" : "left-4 right-4"
              }`}
            >
              <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <p className="truncate text-sm font-semibold">{workspace.name}</p>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                  {workspace.email}
                </p>
              </div>
              <div className="p-1.5">
                <Link
                  href="/settings"
                  onClick={() => setAccountMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <User className="size-4" />
                  Account settings
                </Link>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  {signingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            aria-expanded={accountMenuOpen}
            aria-label="Open account menu"
            className={`flex w-full items-center rounded-xl p-2 text-left transition hover:bg-white/10 ${
              collapsed ? "justify-center" : "gap-3"
            }`}
            title={collapsed ? `${workspace.name} · ${workspace.plan}` : undefined}
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-theme-primary/40 bg-theme-primary/20 text-xs font-bold text-theme-primary-foreground/90">
              {workspace.initials}
            </div>
            {!collapsed && <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {workspace.name}
              </p>
              <span
                className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  workspace.plan !== "free"
                    ? "bg-violet-500/20 text-violet-300"
                    : "bg-white/10 text-slate-300"
                }`}
              >
                {workspace.plan}
              </span>
            </div>}
          </button>
        </div>
      </aside>

      <div
        className={`min-h-screen transition-[padding] duration-300 ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-60"
        }`}
      >
        {!immersivePageOpen && <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-theme-primary text-white lg:hidden">
              <CategoryIcon className="size-4" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-6 text-zinc-950 dark:text-white sm:text-xl">
                {current.label}
              </h1>
              <p className="hidden text-xs text-zinc-500 dark:text-zinc-400 sm:block lg:hidden">
                Helpex {business ? "Business" : "Legal"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <AuthThemeToggle />
            {pathname === "/dashboard" && (
              <Link
                href="/documents/upload"
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-theme-primary px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-theme-primary-hover sm:px-4"
              >
                <Upload className="size-4" />
                <span className="hidden sm:inline">Upload Document</span>
              </Link>
            )}
            {pathname === "/conversations" && !workspace.documentsOverLimit && (
              <Link
                href="/conversations"
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-theme-primary px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-theme-primary-hover sm:px-4"
              >
                <MessageSquare className="size-4" />
                <span className="hidden sm:inline">New Conversation</span>
              </Link>
            )}
          </div>
        </header>}

        <main className={immersivePageOpen ? "pb-16 lg:pb-0" : "pb-24 lg:pb-0"}>{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-zinc-200 bg-white/95 px-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
        {navigation.map(({ label, href, icon: Icon }) => {
          const active = routeIsActive(pathname, href);
          const conversationsLocked = href === "/conversations" && workspace.documentsOverLimit;
          return (
            <Link
              key={href}
              href={href}
              aria-disabled={conversationsLocked}
              onClick={(event) => {
                if (conversationsLocked) event.preventDefault();
              }}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors ${
                active
                  ? "bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark"
                  : conversationsLocked
                    ? "cursor-not-allowed text-zinc-300 dark:text-zinc-700"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="size-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
