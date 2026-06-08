"use client";

import { createClient } from "@/lib/supabase/client";
import type { CategorySlug } from "@/types";
import { Briefcase, Loader2, Scale } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const workspaces = {
  legal: {
    name: "Helpex Legal",
    description: "Open your legal document workspace",
    icon: Scale,
    classes:
      "border-theme-border bg-theme-soft text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark dark:text-theme-soft-foreground-dark",
  },
  business: {
    name: "Helpex Business",
    description: "Open your business document workspace",
    icon: Briefcase,
    classes:
      "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400",
  },
} satisfies Record<CategorySlug, {
  name: string;
  description: string;
  icon: typeof Scale;
  classes: string;
}>;

export function WorkspaceSelector({
  categories,
}: {
  categories: CategorySlug[];
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<CategorySlug | null>(null);
  const [error, setError] = useState("");

  async function selectWorkspace(category: CategorySlug) {
    setLoading(category);
    setError("");
    const response = await fetch("/api/workspace/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Could not open that workspace.");
      setLoading(null);
      return;
    }

    queryClient.clear();
    router.replace("/dashboard");
    router.refresh();
  }

  async function signOut() {
    await createClient().auth.signOut();
    queryClient.clear();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Choose your workspace
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          This email has more than one Helpex account.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const workspace = workspaces[category];
          const Icon = workspace.icon;
          return (
            <button
              key={category}
              type="button"
              onClick={() => void selectWorkspace(category)}
              disabled={loading !== null}
              className="group flex min-h-44 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-zinc-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-current hover:shadow-md disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <span className={`flex size-14 items-center justify-center rounded-2xl border ${workspace.classes}`}>
                {loading === category ? <Loader2 className="size-6 animate-spin" /> : <Icon className="size-6" />}
              </span>
              <span>
                <span className="block font-bold text-zinc-950 dark:text-white">{workspace.name}</span>
                <span className="mt-1 block text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {workspace.description}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void signOut()}
        className="text-sm font-semibold text-zinc-500 transition hover:text-theme-primary dark:text-zinc-400"
      >
        Sign in with another account
      </button>
    </div>
  );
}
