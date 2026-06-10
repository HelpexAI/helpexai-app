"use client";

import type { Document as DocumentRecord } from "@/types";
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCw,
  Share2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition hover:bg-theme-soft hover:text-theme-primary dark:text-zinc-400 dark:hover:bg-theme-soft-dark"
    >
      {children}
    </button>
  );
}

function PageThumbnail({
  page,
  active,
  onClick,
}: {
  page: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`overflow-hidden rounded-lg border-2 ${
        active ? "border-theme-primary" : "border-zinc-200 dark:border-zinc-700"
      }`}
    >
      <div className="flex h-20 items-center justify-center bg-white text-2xl font-bold text-zinc-300">
        {page}
      </div>
      <div className={`py-1 text-center text-xs font-semibold ${active ? "bg-theme-primary text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
        {page}
      </div>
    </button>
  );
}

export function DocumentViewer({
  document,
  downloadUrl,
  extractedText,
  pageCount,
  initialPage = 1,
  highlightExcerpt,
}: {
  document: DocumentRecord;
  downloadUrl: string;
  extractedText: string | null;
  pageCount: number;
  initialPage?: number;
  highlightExcerpt?: string | null;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [currentPage, setCurrentPage] = useState(() => Math.max(initialPage, 1));
  const [resolvedPageCount, setResolvedPageCount] = useState(pageCount);
  const [pagesOpen, setPagesOpen] = useState(true);
  const [shared, setShared] = useState(false);
  const [pageLoading, setPageLoading] = useState(document.file_type === "pdf");
  const [pageError, setPageError] = useState(false);

  useEffect(() => {
    if (!shared) return;
    const timeout = window.setTimeout(() => setShared(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [shared]);

  useEffect(() => {
    setPageLoading(document.file_type === "pdf");
    setPageError(false);
  }, [currentPage, document.file_type]);

  useEffect(() => {
    if (document.file_type !== "pdf") return;
    let cancelled = false;
    void fetch(`/api/documents/${document.id}/pages`)
      .then(async response => response.ok ? response.json() as Promise<{ pageCount: number }> : null)
      .then(result => {
        if (!cancelled && result?.pageCount) setResolvedPageCount(result.pageCount);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [document.file_type, document.id]);

  async function shareDocument() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
    } catch {
      setShared(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href={`/documents?collection=${document.collection_id}`} className="flex shrink-0 items-center gap-1 text-zinc-500 transition hover:text-theme-primary dark:text-zinc-400">
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Documents</span>
          </Link>
          <ChevronRight className="hidden size-3 text-white/30 sm:block" />
          <div className="min-w-0"><span className="block truncate font-medium text-white">{document.name}</span><span className="block truncate text-xs text-white/40">{document.collection?.name ?? "General"}{document.document_tag_assignments?.length ? ` · ${document.document_tag_assignments.map((assignment) => assignment.tag.name).join(", ")}` : ""}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <a href={downloadUrl} className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700">
            <Download className="size-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
          <button type="button" onClick={shareDocument} className="flex h-9 items-center gap-2 rounded-lg bg-theme-primary px-3 text-sm font-medium transition hover:bg-theme-primary-hover">
            {shared ? <Check className="size-4" /> : <Share2 className="size-4" />}
            <span className="hidden sm:inline">{shared ? "Copied" : "Share"}</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-12 items-center justify-between gap-3 overflow-x-auto border-b border-zinc-200 bg-white px-2 py-2 dark:border-zinc-800 dark:bg-zinc-900 sm:px-4">
          <div className="flex shrink-0 items-center gap-1">
            <ToolButton label={pagesOpen ? "Hide pages" : "Show pages"} onClick={() => setPagesOpen((open) => !open)}>
              {pagesOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </ToolButton>
            <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />
            <ToolButton label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 10))}><ZoomOut className="size-4" /></ToolButton>
            <span className="w-11 text-center text-xs text-zinc-500 dark:text-zinc-400">{zoom}%</span>
            <ToolButton label="Zoom in" onClick={() => setZoom((value) => Math.min(180, value + 10))}><ZoomIn className="size-4" /></ToolButton>
            <ToolButton label="Rotate" onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw className="size-4" /></ToolButton>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ToolButton label="Previous page" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft className="size-4" /></ToolButton>
            <span className="px-2 text-xs text-zinc-500 dark:text-zinc-400">
              Page <strong className="text-zinc-950 dark:text-white">{currentPage}</strong> of {resolvedPageCount}
            </span>
            <ToolButton label="Next page" onClick={() => setCurrentPage((page) => Math.min(resolvedPageCount, page + 1))}><ChevronRight className="size-4" /></ToolButton>
            <ToolButton label="Full screen" onClick={() => void viewerRef.current?.requestFullscreen()}><Maximize2 className="size-4" /></ToolButton>
          </div>
        </div>

        <div ref={viewerRef} className="flex min-h-0 flex-1 overflow-hidden bg-zinc-100 dark:bg-zinc-950">
          {pagesOpen && document.file_type === "pdf" && (
            <aside className="theme-scrollbar hidden w-40 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:block">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Pages</p>
              <div className="flex flex-col gap-3">
                {Array.from({ length: resolvedPageCount }, (_, index) => index + 1).map((page) => (
                  <PageThumbnail
                    key={page}
                    page={page}
                    active={page === currentPage}
                    onClick={() => setCurrentPage(page)}
                  />
                ))}
              </div>
            </aside>
          )}

          <main className="theme-scrollbar min-w-0 flex-1 overflow-auto p-3 sm:p-6 lg:p-8">
            <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center gap-5">
              {document.file_type === "pdf" ? (
                <div className="relative flex min-h-[50vh] w-full justify-center">
                  {pageLoading && !pageError && <div className="absolute inset-x-0 top-16 mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white p-5 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"><LoaderDocumentPage /><span>Rendering page {currentPage}...</span></div>}
                  {pageError ? (
                    <div className="mt-16 flex max-w-sm flex-col items-center gap-3 rounded-xl border border-red-400/30 bg-red-950/30 p-6 text-center"><AlertCircle className="size-7 text-red-300" /><p className="font-semibold">This page could not be displayed.</p><p className="text-sm text-white/60">Download the original document to view it on this device.</p><a href={downloadUrl} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold">Download document</a></div>
                  ) : (
                    // The authenticated page endpoint cannot use Next Image optimization.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={currentPage}
                      src={`/api/documents/${document.id}/pages/${currentPage}`}
                      alt={`${document.name}, page ${currentPage}`}
                      onLoad={() => setPageLoading(false)}
                      onError={() => { setPageLoading(false); setPageError(true); }}
                      className={`h-auto max-w-full self-start rounded-lg bg-white shadow-2xl transition-[width,transform,opacity] duration-200 sm:max-w-none ${pageLoading ? "opacity-0" : "opacity-100"}`}
                      style={{
                        width: `${Math.round(850 * (zoom / 100))}px`,
                        transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      }}
                    />
                  )}
                </div>
              ) : (
                <article className="mx-auto min-h-[80vh] max-w-3xl whitespace-pre-wrap rounded-lg bg-white p-6 text-sm leading-7 text-zinc-700 shadow-2xl sm:p-10 lg:p-14">
                  <div className="mb-8 flex items-center gap-3 border-b border-zinc-200 pb-5">
                    <FileText className="size-6 text-theme-primary" />
                    <h1 className="break-all text-lg font-bold text-zinc-900">{document.name}</h1>
                  </div>
                  <HighlightedDocumentText text={extractedText || "No readable text was found in this document."} excerpt={highlightExcerpt} />
                </article>
              )}
              {highlightExcerpt && document.file_type === "pdf" && (
                <aside className="w-full max-w-[850px] rounded-xl border border-amber-300/50 bg-amber-100 p-4 text-zinc-900 shadow-xl">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-800">Referenced content on page {currentPage}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6"><mark className="rounded bg-amber-300 px-1 text-zinc-950">{highlightExcerpt}</mark></p>
                </aside>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function LoaderDocumentPage() {
  return <div className="size-8 animate-spin rounded-full border-2 border-zinc-200 border-t-theme-primary dark:border-zinc-700" />;
}

function HighlightedDocumentText({ text, excerpt }: { text: string; excerpt?: string | null }) {
  const needle = excerpt?.trim();
  if (!needle) return text;
  const start = text.toLowerCase().indexOf(needle.toLowerCase());
  if (start < 0) {
    return (
      <>
        <aside className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-zinc-800">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber-800">Referenced content</p>
          <mark className="bg-amber-200 text-zinc-950">{needle}</mark>
        </aside>
        {text}
      </>
    );
  }
  return (
    <>
      {text.slice(0, start)}
      <mark className="rounded bg-amber-200 px-0.5 text-zinc-950">{text.slice(start, start + needle.length)}</mark>
      {text.slice(start + needle.length)}
    </>
  );
}
