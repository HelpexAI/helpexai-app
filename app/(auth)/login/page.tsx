import { LoginForm } from "@/components/auth/login-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your HelpexAI account.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-[440px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
      <LoginForm />
    </Suspense>
  );
}
