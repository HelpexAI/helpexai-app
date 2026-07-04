"use client";

import { BrandLogo } from "@/components/brand-logo";
import { useThemeMode } from "@/lib/theme-mode";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { label: "Free Tool", homeHref: "/free-tool", otherHref: "/free-tool" },
  { label: "Guides", homeHref: "/blog", otherHref: "/blog" },
  // { label: "Features", homeHref: "#features", otherHref: "/#features" },
  { label: "Pricing", homeHref: "/pricing", otherHref: "/pricing" },
  { label: "Privacy Policy", homeHref: "/privacy", otherHref: "/privacy" },
];

type MarketingHeaderProps = {
  authCategory?: string;
};

export function MarketingHeader({ authCategory }: MarketingHeaderProps = {}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const { dark, toggleTheme } = useThemeMode();

  useEffect(() => {
    if (authCategory) return;

    let unsubscribe: (() => void) | undefined;
    void import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      void supabase.auth.getSession().then(({ data }) => {
        setAuthenticated(Boolean(data.session));
      });
      const { data: subscription } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setAuthenticated(Boolean(session));
        },
      );
      unsubscribe = () => subscription.subscription.unsubscribe();
    });
    return () => unsubscribe?.();
  }, [authCategory]);

  const signInHref = authCategory
    ? `/login?category=${authCategory}`
    : authenticated
      ? "/dashboard"
      : "/login";
  const signInLabel = authCategory
    ? "Sign In"
    : authenticated
      ? "Open Dashboard"
      : "Sign In";
  const signupHref = authCategory
    ? `/signup?category=${authCategory}`
    : "/signup";
  const showSignIn = Boolean(authCategory) || authenticated !== null;

  return (
    <header className="relative rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandLogo className="size-9 shrink-0 rounded-xl shadow-sm sm:size-10" priority />
          <div className="flex min-w-0 flex-col leading-none">
            <span className="text-base font-semibold leading-6 tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-lg sm:leading-7">
              HelpexAI
            </span>
            <span className="hidden text-xs leading-4 text-zinc-500 dark:text-zinc-400 sm:block">
              AI Business Knowledge Workspace
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium leading-5 text-zinc-500 dark:text-zinc-400 lg:flex xl:gap-8">
          {links.map((link) => {
            const href = pathname === "/" ? link.homeHref : link.otherHref;
            const active =
              (link.label === "Privacy Policy" && pathname === "/privacy") ||
              (link.label === "Free Tool" && pathname === "/free-tool") ||
              (link.label === "Guides" && pathname.startsWith("/blog"));

            return (
              <Link
                key={link.label}
                className={`transition-colors hover:text-zinc-950 dark:hover:text-white ${
                  active ? "text-zinc-950 dark:text-white" : ""
                }`}
                href={href}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
            title={dark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <div className="hidden items-center gap-4 lg:flex">
            {showSignIn && (
              <Link
                className="text-sm font-medium leading-5 text-zinc-800 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                href={signInHref}
              >
                {signInLabel}
              </Link>
            )}
            <Link
              href={signupHref}
              className="rounded-full bg-theme-primary px-5 py-2 text-sm font-semibold leading-5 text-theme-primary-foreground shadow-sm transition-colors hover:bg-theme-primary-hover"
            >
              Get Started
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 lg:hidden"
            aria-expanded={menuOpen}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
          >
            {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="mt-4 grid gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800 lg:hidden">
          {links.map((link) => (
            <Link
              key={link.label}
              href={pathname === "/" ? link.homeHref : link.otherHref}
              onClick={() => setMenuOpen(false)}
              className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            {showSignIn && (
              <Link
                href={signInHref}
                className="rounded-full border border-zinc-200 px-4 py-2.5 text-center text-sm font-semibold text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              >
                {signInLabel}
              </Link>
            )}
            <Link
              href={signupHref}
              className="rounded-full bg-theme-primary px-4 py-2.5 text-center text-sm font-semibold text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
