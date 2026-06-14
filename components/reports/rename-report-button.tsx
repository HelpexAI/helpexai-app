"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { queryKeys } from "@/lib/client/query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

async function renameReport({
  reportId,
  title,
}: {
  reportId: string;
  title: string;
}) {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  const result = (await response.json().catch(() => null)) as {
    report?: { id: string; title: string };
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(result?.error ?? "Could not rename report.");
  }

  return result;
}

export function RenameReportButton({
  reportId,
  currentTitle,
  compact = true,
}: {
  reportId: string;
  currentTitle: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(currentTitle);

  const mutation = useMutation({
    mutationFn: renameReport,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.report(reportId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);

      setOpen(false);
      router.refresh();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();

    if (!nextTitle) return;

    mutation.mutate({
      reportId,
      title: nextTitle,
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setTitle(currentTitle);
          setOpen(true);
        }}
        className={
          compact
            ? "inline-flex size-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 transition hover:bg-zinc-50 hover:text-theme-primary dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-950"
            : "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-950"
        }
        title="Rename report"
      >
        <Pencil className="size-4" />
        {!compact && "Rename"}
      </button>

      <ResponsiveModal
        open={open}
        onClose={() => {
          if (!mutation.isPending) setOpen(false);
        }}
        ariaLabel="Rename report"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-zinc-950 dark:text-white">
              Rename report
            </h2>

            <p className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Update the report name shown in your reports list and report
              detail page.
            </p>
          </div>

          <div>
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Report name
            </label>

            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={mutation.isPending}
              autoFocus
              maxLength={160}
              className="mt-2 h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-theme-border focus:ring-2 focus:ring-theme-border/40 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-theme-border-dark"
              placeholder="Enter report name"
            />
          </div>

          {mutation.error instanceof Error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {mutation.error.message}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-950"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={mutation.isPending || !title.trim()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white transition hover:bg-theme-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {mutation.isPending ? "Saving..." : "Save name"}
            </button>
          </div>
        </form>
      </ResponsiveModal>
    </>
  );
}
