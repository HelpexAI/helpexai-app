"use client";

import { GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/client";
import { SignUpSchema } from "@/lib/validations/schemas";
import type { CategorySlug, Product } from "@/types";
import { Briefcase, Check, Loader2, Scale } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { themeStyle } from "@/lib/theme";

const inputClass =
  "h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-theme-primary focus:ring-2 focus:ring-theme-primary/15 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500";

export function SignupForm({ products }: { products: Product[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("category");
  const requestedProduct = products.find(
    (product) => product.slug === requestedCategory,
  );
  const [category, setCategory] = useState<CategorySlug | null>(
    requestedProduct?.slug ?? (products.length === 1 ? products[0].slug : null),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState("");
  const activeProduct = products.find((product) => product.slug === category);

  async function continueWithGoogle() {
    if (!category) return;
    setLoading("google");
    setError("");
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?mode=signup&category=${category}`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, queryParams: { prompt: "select_account" } },
    });

    if (authError) {
      setError(authError.message);
      setLoading(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!category) {
      setError("Choose a product first.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const parsed = SignUpSchema.safeParse({
      email,
      password,
      category_slug: category,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }

    setLoading("email");
    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?mode=signup&category=${category}`;
    const { data, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo,
        data: { category_slug: category },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(null);
      return;
    }

    if (data.session && data.user) {
      const accountResponse = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!accountResponse.ok) {
        const result = await accountResponse.json();
        setError(result.error ?? "Could not create your Helpex account.");
        setLoading(null);
        return;
      }

      const workspaceResponse = await fetch("/api/workspace/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });

      if (!workspaceResponse.ok) {
        const result = (await workspaceResponse.json()) as { error?: string };
        setError(result.error ?? "Could not open your new Helpex account.");
        setLoading(null);
        return;
      }

      router.push("/dashboard");
      router.refresh();
      return;
    }

    router.push(
      `/verify-email?email=${encodeURIComponent(email)}&category=${category}`,
    );
  }

  return (
    <div
      className="flex flex-col gap-6"
      style={themeStyle(activeProduct?.theme)}
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Create your account
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Get started with HelpexAI in minutes
        </p>
      </div>

      {!category && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
            Choose your product
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {products.map(({ slug, name, description, icon }) => {
              const Icon = icon === "scale" ? Scale : Briefcase;

              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => setCategory(slug)}
                  style={themeStyle(
                    products.find((product) => product.slug === slug)?.theme,
                  )}
                  className={`relative flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${"border-theme-border bg-theme-soft hover:border-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark"}`}
                >
                  <div
                    className={`flex size-12 items-center justify-center rounded-xl ${"bg-theme-soft text-theme-primary dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark"}`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-950 dark:text-white">
                      {name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {description}
                    </p>
                  </div>
                  <div
                    className={`flex size-5 items-center justify-center rounded-full border-2 text-white ${"border-theme-primary bg-theme-primary"}`}
                  >
                    <Check className="size-3" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {category && (
        <>
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
            <span className="text-xs font-medium uppercase text-zinc-500">
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
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a strong password"
                autoComplete="new-password"
                className={inputClass}
                required
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-zinc-950 dark:text-zinc-100">
              <span>Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password"
                autoComplete="new-password"
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

            <button
              type="submit"
              disabled={loading !== null}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-theme-primary text-sm font-semibold text-white shadow-sm transition hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "email" && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href={`/login?category=${category}`}
              className="font-semibold text-theme-primary"
            >
              Sign in
            </Link>
          </p>
        </>
      )}
      <p className="text-center text-xs leading-5 text-zinc-400 dark:text-zinc-500">
        By creating an account, you agree to our terms and{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
