"use client";

import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

function getForgotPasswordErrorMessage(error: string | null) {
  switch (error) {
    case "otp_expired":
      return "That reset link is invalid or has expired. Please request a new link.";
    case "missing_code":
      return "That reset link is missing required information. Please request a new link.";
    case "pkce_code_verifier_not_found":
      return "Open the reset link in the same browser where you requested it, or request a new link.";
    case "auth_fetch_failed":
      return "We could not reach the auth service. Please check your connection and request a new reset link.";
    case "auth_callback":
      return "We could not verify that reset link. Please request a new link.";
    default:
      return "";
  }
}

export function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const categoryQuery = requestedCategory
    ? `?category=${encodeURIComponent(requestedCategory)}`
    : "";
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() =>
    getForgotPasswordErrorMessage(searchParams.get("error")),
  );
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    setLoading(true);
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );

    if (resetError) {
      setError(
        resetError.message.toLowerCase().includes("rate limit")
          ? "Too many reset emails were requested. Please try again later."
          : resetError.message,
      );
    } else {
      setNotice("Password reset link sent. Check your email.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-2">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-theme-primary/10 text-theme-primary">
          <Mail className="size-5" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Reset your password
        </h1>
        <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Enter your account email and we will send you a secure reset link.
        </p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="space-y-1.5 text-sm font-medium text-zinc-950 dark:text-zinc-100">
          <span>Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputClass}
            required
          />
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white shadow-sm transition hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Send Reset Link
        </button>
      </form>

      <Link
        href={`/login${categoryQuery}`}
        className="flex items-center justify-center gap-2 text-sm font-medium text-zinc-500 transition hover:text-theme-primary dark:text-zinc-400"
      >
        <ArrowLeft className="size-4" />
        Back to Sign In
      </Link>
    </div>
  );
}
