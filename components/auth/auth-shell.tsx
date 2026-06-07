import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex min-h-screen w-full">
        <AuthBrandPanel />
        <main className="relative flex min-h-screen w-full items-center justify-center px-4 py-20 sm:px-8 lg:w-[58%] lg:px-12 lg:py-12 xl:w-[60%]">
          <div className="absolute left-4 top-4 lg:hidden">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#2b7fff] text-white">
                <LayoutDashboard className="size-4" />
              </div>
              <span className="font-bold tracking-tight">HelpexAI</span>
            </Link>
          </div>
          <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
            <AuthThemeToggle />
          </div>
          <div className="w-full max-w-[480px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
