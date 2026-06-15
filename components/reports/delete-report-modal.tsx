"use client";

import { ResponsiveModal } from "@/components/dashboard/responsive-modal";
import { FileText, Loader2, Trash2 } from "lucide-react";

export function DeleteReportModal({
  open,
  reportTitle,
  deleting,
  onClose,
  onConfirm,
}: {
  open: boolean;
  reportTitle: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ResponsiveModal
      open={open}
      onClose={() => {
        if (!deleting) onClose();
      }}
      ariaLabel="Delete report confirmation"
      showClose={false}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
          <Trash2 className="size-10 text-red-500 dark:text-red-400" />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="text-2xl font-bold text-zinc-950 dark:text-white">
            Delete this report?
          </h2>

          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
            <FileText className="size-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
            <span className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-100">
              {reportTitle}
            </span>
          </div>

          <p className="max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            This will permanently remove the report, its knowledge item, and
            AI vector data. Original source documents are not affected. This
            cannot be undone.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="h-11 w-full rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-500 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {deleting ? "Deleting..." : "Delete Report"}
          </button>
        </div>
      </div>
    </ResponsiveModal>
  );
}
