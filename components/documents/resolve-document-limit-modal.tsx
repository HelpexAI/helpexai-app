"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import type { Document } from "@/types";
import { Check, FileText, Loader2, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { invalidateWorkspaceQueries } from "@/lib/client/query";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

export function ResolveDocumentLimitModal({
  documents,
  limit,
}: {
  documents: Document[];
  limit: number;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function resolveLimit() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/documents/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keep_document_ids: selected }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not update your documents.");
      setLoading(false);
      return;
    }
    await invalidateWorkspaceQueries(queryClient);
    router.refresh();
  }

  return (
    <ResponsiveModal open onClose={() => undefined} ariaLabel="Choose documents to keep" showClose={false}>
      <div className="space-y-5">
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <ShieldAlert className="size-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold">Choose {limit} document{limit === 1 ? "" : "s"} to keep</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Your subscription is no longer active. Select the documents that should remain; all other documents and conversations using them will be permanently deleted.
          </p>
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto">
          {documents.map((document) => {
            const checked = selected.includes(document.id);
            const disabled = !checked && selected.length >= limit;
            return (
              <button
                key={document.id}
                type="button"
                disabled={disabled || loading}
                onClick={() => setSelected((current) => checked ? current.filter((id) => id !== document.id) : [...current, document.id])}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition disabled:opacity-45 ${checked ? "border-theme-primary bg-theme-soft dark:bg-theme-soft-dark" : "border-zinc-200 dark:border-zinc-700"}`}
              >
                <span className={`flex size-5 shrink-0 items-center justify-center rounded border ${checked ? "border-theme-primary bg-theme-primary text-white" : "border-zinc-300 dark:border-zinc-600"}`}>
                  {checked && <Check className="size-3" />}
                </span>
                <FileText className="size-4 shrink-0 text-theme-primary" />
                <span className="min-w-0 truncate text-sm font-semibold">{document.name}</span>
              </button>
            );
          })}
        </div>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
        <button
          type="button"
          onClick={() => void resolveLimit()}
          disabled={selected.length !== limit || loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-theme-primary text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Keep Selected and Delete Others
        </button>
      </div>
    </ResponsiveModal>
  );
}
