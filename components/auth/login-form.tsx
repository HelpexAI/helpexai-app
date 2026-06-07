"use client";

import { GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/client";
import { SignInSchema } from "@/lib/validations/schemas";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#2b7fff] focus:ring-2 focus:ring-[#2b7fff]/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const category =
    requestedCategory === "legal" || requestedCategory === "business"
      ? requestedCategory
      : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"google" | "email" | "reset" | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function continueWithGoogle() {
    setLoading("google");
    setError("");
    setNotice("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${category ? `?category=${category}` : ""}`,
        queryParams: { prompt: "select_account" },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const parsed = SignInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }

    setLoading("email");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword(
      parsed.data,
    );

    if (authError) {
      setError(authError.message);
      setLoading(null);
      return;
    }

    if (category && data.user) {
      const { error: accountError } = await supabase.from("accounts").upsert(
        {
          user_id: data.user.id,
          category_slug: category,
          plan: "free",
        },
        { onConflict: "user_id,category_slug" },
      );

      if (accountError) {
        setError(accountError.message);
        setLoading(null);
        return;
      }
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function sendResetEmail() {
    setError("");
    setNotice("");

    if (!email) {
      setError("Enter your email address first.");
      return;
    }

    setLoading("reset");
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      { redirectTo: `${window.location.origin}/auth/callback?next=/settings` },
    );

    if (resetError) {
      setError(resetError.message);
    } else {
      setNotice("Password reset link sent. Check your email.");
    }
    setLoading(null);
  }

  return (
    <div className="flex flex-col gap-7 rounded-2xl border border-transparent bg-transparent sm:p-0">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Welcome back
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {category
            ? `Sign in to continue with Helpex ${category === "legal" ? "Legal" : "Business"}`
            : "Sign in to your HelpexAI account"}
        </p>
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={loading !== null}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-zinc-200 bg-white text-sm font-medium text-zinc-950 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
      >
        {loading === "google" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <GoogleIcon />
        )}
        Continue with Google
      </button>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          or
        </span>
        <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
        <label className="space-y-1.5 text-sm font-medium text-zinc-950 dark:text-zinc-100">
          <span>Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`${inputClass} pr-11`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 transition hover:text-zinc-700 dark:hover:text-zinc-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </label>

        <button
          type="button"
          onClick={sendResetEmail}
          disabled={loading !== null}
          className="self-end text-xs font-semibold text-[#2b7fff] disabled:opacity-60"
        >
          {loading === "reset" ? "Sending reset link..." : "Forgot password?"}
        </button>

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
          disabled={loading !== null}
          className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#2b7fff] text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "email" && <Loader2 className="size-4 animate-spin" />}
          Sign In
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-[#2b7fff]">
          Sign up
        </Link>
      </p>
    </div>
  );
}
