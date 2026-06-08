"use client";

import { createClient } from "@/lib/supabase/client";
import type { CategorySlug } from "@/types";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function VerifyEmailCard({
  email,
  category,
}: {
  email?: string;
  category?: CategorySlug;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const categoryQuery = category ? `?category=${category}` : "";

  async function resendVerification() {
    setError("");
    setNotice("");

    if (!email) {
      setError("Return to signup and enter your email address again.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const callbackQuery = category ? `?mode=signup&category=${category}` : "";
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback${callbackQuery}`,
      },
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setNotice("A new verification email has been sent.");
    }
    setLoading(false);
  }

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
      <div className="w-full rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="flex size-20 items-center justify-center rounded-full bg-theme-primary/10">
            <Mail className="size-10 text-theme-primary" strokeWidth={1.5} />
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Check your email
            </h1>
            <p className="max-w-[350px] text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              We sent a verification link
              {email ? (
                <>
                  {" "}
                  to{" "}
                  <span className="font-semibold text-zinc-950 dark:text-zinc-100">
                    {email}
                  </span>
                </>
              ) : null}
              . Click the link to activate your account.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2 text-sm">
            <button
              type="button"
              onClick={resendVerification}
              disabled={loading}
              className="flex items-center gap-2 font-medium text-theme-primary underline underline-offset-4 transition-colors hover:text-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              {loading ? "Sending..." : "Resend verification email"}
            </button>
            <Link
              href={`/signup${categoryQuery}`}
              className="text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Wrong email address?{" "}
              <span className="font-medium text-theme-primary underline underline-offset-4">
                Go back
              </span>
            </Link>
          </div>

          {error && (
            <p
              role="alert"
              className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              role="status"
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {notice}
            </p>
          )}

          <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            Don&apos;t see it? Check your spam or junk folder.
          </p>

          <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />

          <Link
            href="/login"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="size-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 lg:hidden">
        &copy; 2026 HelpexAI. All rights reserved.
      </p>
    </div>
  );
}
