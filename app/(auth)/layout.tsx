import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";
import { Suspense } from "react";
import { getActiveProducts } from "@/lib/products/catalog";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const products = await getActiveProducts();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
          <div className="size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-theme-primary dark:border-zinc-800 dark:border-t-theme-primary" />
        </div>
      }
    >
      <AuthShell products={products}>{children}</AuthShell>
    </Suspense>
  );
}
