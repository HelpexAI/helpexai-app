import { SignupForm } from "@/components/auth/signup-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your HelpexAI Legal or Business account.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-[640px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
      <SignupForm />
    </Suspense>
  );
}
