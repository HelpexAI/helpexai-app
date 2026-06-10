"use client";

import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthThemeToggle } from "@/components/auth/auth-theme-toggle";
import { themeStyle } from "@/lib/theme";
import type { Product } from "@/types";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useSearchParams } from "next/navigation";

export function AuthShell({
  children,
  products,
}: {
  children: React.ReactNode;
  products: Product[];
}) {
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const product =
    products.find((item) => item.slug === requestedCategory) ??
    (products.length === 1 ? products[0] : undefined);
  const category = product?.slug;
  const productHref =
    category === "business"
      ? "/business"
      : category
        ? `/products/${category}`
        : "/";

  return (
    <div
      className="min-h-screen bg-slate-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
      style={themeStyle(product?.theme ?? "main")}
    >
      <div className="flex min-h-screen w-full">
        <AuthBrandPanel />
        <main className="relative flex min-h-screen w-full items-center justify-center px-4 py-20 sm:px-8 lg:w-[58%] lg:px-12 lg:py-12 xl:w-[60%]">
          <div className="absolute left-4 top-4 lg:hidden">
            <Link href={productHref} className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-theme-primary text-white">
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
