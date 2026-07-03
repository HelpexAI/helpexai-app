"use client";

import { ClientPageError } from "@/components/dashboard/client-page-error";
import type { Document } from "@/types";
import { fetchJson, queryKeys } from "@/lib/client/query";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

type ViewerResponse = {
  error?: string;
  document: Document;
  viewUrl: string;
  downloadUrl: string;
  extractedText: string | null;
};

function OpeningDocument() {
  return (
    <div className="flex h-full min-h-72 items-center justify-center bg-[#18243a]">
      <div className="text-center text-white/60">
        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-white/20 border-t-theme-primary" />
        <p className="mt-3 text-sm font-medium">Opening document...</p>
      </div>
    </div>
  );
}

function BrowserDocumentView({
  document,
  viewUrl,
  downloadUrl,
}: {
  document: Document;
  viewUrl: string;
  downloadUrl: string;
}) {
  const isReportDocument = document.document_tag_assignments?.some(
    (assignment) => assignment.tag.name === "Report",
  );
  const displayName = isReportDocument
    ? document.name.replace(/\.(txt|md)$/i, "")
    : document.name;

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link
            href={`/documents?collection=${document.collection_id}`}
            className="flex shrink-0 items-center gap-1 text-zinc-500 transition hover:text-theme-primary dark:text-zinc-400"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Documents</span>
          </Link>
          <span className="hidden text-zinc-300 dark:text-zinc-700 sm:inline">/</span>
          <div className="min-w-0">
            <span className="block truncate font-medium text-zinc-950 dark:text-white">
              {displayName}
            </span>
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
              {document.collection?.name ?? "General"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={viewUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-2 rounded-lg bg-theme-primary px-3 text-sm font-medium text-white transition hover:bg-theme-primary-hover"
          >
            <ExternalLink className="size-4" />
            <span className="hidden sm:inline">Open</span>
          </a>
          <a
            href={downloadUrl}
            className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </header>

      <main className="min-h-0 flex-1 bg-zinc-100 dark:bg-zinc-950">
        <iframe
          title={displayName}
          src={viewUrl}
          className="h-full min-h-[calc(100dvh-8rem)] w-full border-0 bg-white dark:bg-zinc-950"
        />
      </main>
    </div>
  );
}

export function DocumentViewerClientPage({
  id,
}: {
  id: string;
  initialPage: number;
  highlightExcerpt: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, error, refetch } = useQuery({
    queryKey: queryKeys.document(id),
    queryFn: () => fetchJson<ViewerResponse>(`/api/documents/${id}`),
  });
  useEffect(() => {
    if (!data?.document.collection_id || searchParams.get("collection") === data.document.collection_id) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("collection", data.document.collection_id);
    router.replace(`/documents/${id}?${next.toString()}`, { scroll: false });
  }, [data?.document.collection_id, id, router, searchParams]);
  if (error) return <ClientPageError message={error.message} onRetry={() => void refetch()} />;
  if (!data) return <OpeningDocument />;
  return (
    <BrowserDocumentView
      document={data.document}
      viewUrl={data.viewUrl}
      downloadUrl={data.downloadUrl}
    />
  );
}
