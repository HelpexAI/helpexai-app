import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="mt-8 flex flex-col items-center gap-5 rounded-2xl border border-zinc-200 bg-white px-5 py-5 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:mt-10 sm:px-6 lg:flex-row lg:justify-between lg:text-left">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-theme-primary text-theme-primary-foreground">
          <LayoutDashboard className="size-4" />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold leading-5 text-zinc-950 dark:text-zinc-50">
            HelpexAI
          </span>
          <span className="text-xs leading-4 text-zinc-500 dark:text-zinc-400">
            Document Intelligence Platform
          </span>
        </div>
      </Link>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400 sm:gap-x-6">
        <Link href="/free-tool">Free Tool</Link>
        <Link href="/blog">Guides</Link>
        <Link href="/#features">Features</Link>
        <Link href="/#pricing">Pricing</Link>
        <Link href="/privacy">Privacy Policy</Link>
      </div>
      <p className="text-sm leading-5 text-zinc-500 dark:text-zinc-400">
        &copy; 2026 HelpexAI. All rights reserved.
      </p>
    </footer>
  );
}
