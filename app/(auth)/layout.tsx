import { AuthShell } from "@/components/auth/auth-shell";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950">
          <div className="size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-theme-primary dark:border-zinc-800 dark:border-t-theme-primary" />
        </div>
      }
    >
      <AuthShell>{children}</AuthShell>
    </Suspense>
  );
}
