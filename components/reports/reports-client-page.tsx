"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import { DeleteReportButton } from "@/components/reports/delete-report-button";
import { fetchJson, queryKeys } from "@/lib/client/query";
import { formatDate } from "@/lib/utils";
import type { CategorySlug, PlanSlug, ReportStatus } from "@/types";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  FileText,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { RenameReportButton } from "./rename-report-button";

type ReportSummary = {
  id: string;
  title: string;
  status: ReportStatus;
  template_id: string | null;
  template_slug: string | null;
  generated_document_id: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
};

type ReportsResponse = {
  reports: ReportSummary[];
  readyDocumentsCount: number;
  category: CategorySlug;
  plan: PlanSlug;
  locked: boolean;
  documentLimit: {
    used: number;
    limit: number;
    requiresResolution: boolean;
  };
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const styles: Record<ReportStatus, string> = {
    draft:
      "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    generating:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    completed:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    finalized:
      "border-theme-border bg-theme-soft text-theme-primary dark:border-theme-border-dark dark:bg-theme-soft-dark",
    failed:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ReportsSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-96 max-w-full rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="h-10 w-36 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <div className="h-72 rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    </div>
  );
}

function ReportsList({ reports }: { reports: ReportSummary[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <h2 className="font-bold text-zinc-950 dark:text-white">
          Saved reports
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          Reports generated from your knowledge base.
        </p>
      </div>

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {reports.map((report) => (
          <div
            key={report.id}
            className="flex flex-col gap-3 p-5 transition hover:bg-zinc-50 dark:hover:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between"
          >
            <Link
              href={report.status === "finalized" ? `/reports/${report.id}` : `/reports/${report.id}/preview`}
              className="flex min-w-0 flex-1 items-start gap-3"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
                <FileText className="size-5" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-zinc-950 dark:text-white">
                  {report.title}
                </h3>

                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="capitalize">
                    {report.template_slug
                      ? report.template_slug.replaceAll("-", " ")
                      : "Custom report"}
                  </span>

                  <span>•</span>

                  <span className="inline-flex items-center gap-1">
                    <Calendar className="size-3" />
                    {formatDate(report.updated_at)}
                  </span>
                </div>
              </div>
            </Link>

            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <StatusBadge status={report.status} />
              <RenameReportButton
                reportId={report.id}
                currentTitle={report.title}
                compact
              />
              <DeleteReportButton
                reportId={report.id}
                reportTitle={report.title}
                compact
                redirectAfterDelete={false}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyReportsState() {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
        <Sparkles className="size-8" />
      </div>

      <h2 className="mt-5 text-2xl font-bold text-zinc-950 dark:text-white">
        No reports yet
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        Your generated reports will appear here after you create and save them.
      </p>
    </section>
  );
}

export function ReportsClientPage() {
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => fetchJson<ReportsResponse>("/api/reports"),
  });

  if (error) {
    return (
      <ClientPageError message={error.message} onRetry={() => void refetch()} />
    );
  }

  if (!data) return <ReportsSkeleton />;

  const hasReports = data.reports.length > 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-theme-soft text-theme-primary dark:bg-theme-soft-dark">
              <BarChart3 className="size-5" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-950 dark:text-white">
              Reports
            </h1>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Generate professional reports from your uploaded documents. Saved
            reports are stored as markdown, appear in your knowledge base,
            and can be downloaded as PDF.
          </p>
        </div>

        <Link
          href="/reports/templates"
          className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-theme-primary px-4 text-sm font-semibold text-white transition hover:bg-theme-primary-hover"
        >
          <Plus className="size-4" />
          Create Report
        </Link>
      </div>

      {hasReports ? (
        <ReportsList reports={data.reports} />
      ) : (
        <EmptyReportsState />
      )}
    </div>
  );
}
