import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset your HelpexAI account password.",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="h-[360px] animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
