"use client";

import { DeleteReportModal } from "@/components/reports/delete-report-modal";
import { queryKeys } from "@/lib/client/query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

async function deleteReport(reportId: string) {
  const response = await fetch(`/api/reports/${reportId}`, {
    method: "DELETE",
  });

  const result = (await response.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(result?.error ?? "Could not delete report.");
  }

  return result;
}

export function DeleteReportButton({
  reportId,
  reportTitle,
  compact = false,
  redirectAfterDelete = true,
}: {
  reportId: string;
  reportTitle: string;
  compact?: boolean;
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: () => deleteReport(reportId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reports }),
        queryClient.invalidateQueries({ queryKey: queryKeys.documents }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      ]);

      setModalOpen(false);

      if (redirectAfterDelete) {
        router.push("/reports");
      }

      router.refresh();
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Could not delete report.";

      window.alert(message);
    },
  });

  return (
    <>
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setModalOpen(true);
        }}
        className={
          compact
            ? "inline-flex size-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
            : "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
        }
        title="Delete report"
      >
        {mutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Trash2 className="size-4" />
            {!compact && "Delete"}
          </>
        )}
      </button>

      <DeleteReportModal
        open={modalOpen}
        reportTitle={reportTitle}
        deleting={mutation.isPending}
        onClose={() => setModalOpen(false)}
        onConfirm={() => mutation.mutate()}
      />
    </>
  );
}
