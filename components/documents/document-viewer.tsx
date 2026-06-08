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
  MessageSquare,
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
      className="flex size-8 shrink-0 items-center justify-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
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
        active ? "border-theme-primary" : "border-white/10"
      }`}
    >
      <div className="flex h-20 items-center justify-center bg-white text-2xl font-bold text-zinc-300">
        {page}
      </div>
      <div className={`py-1 text-center text-xs font-semibold ${active ? "bg-theme-primary text-white" : "bg-[#10203a] text-white/40"}`}>
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
  const [currentPage, setCurrentPage] = useState(() => Math.min(Math.max(initialPage, 1), pageCount));
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

  async function shareDocument() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShared(true);
    } catch {
      setShared(false);
    }
  }

  return (
    <>
      <MobileDocumentViewer
        document={document}
        downloadUrl={downloadUrl}
        extractedText={extractedText}
        pageCount={pageCount}
        initialPage={initialPage}
        highlightExcerpt={highlightExcerpt}
      />
      <div className="hidden min-h-[calc(100vh-4rem)] flex-col bg-[#18243a] text-white lg:flex lg:h-screen lg:min-h-0">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#0a1628] px-3 py-3 sm:px-5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/documents" className="flex shrink-0 items-center gap-1 text-white/60 transition hover:text-white">
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Documents</span>
          </Link>
          <ChevronRight className="hidden size-3 text-white/30 sm:block" />
          <span className="truncate font-medium text-white">{document.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/conversations" className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm transition hover:bg-white/15">
            <MessageSquare className="size-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </Link>
          <a href={downloadUrl} className="flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm transition hover:bg-white/15">
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
        <div className="flex min-h-12 items-center justify-between gap-3 overflow-x-auto border-b border-white/10 bg-[#10203a] px-2 py-2 sm:px-4">
          <div className="flex shrink-0 items-center gap-1">
            <ToolButton label={pagesOpen ? "Hide pages" : "Show pages"} onClick={() => setPagesOpen((open) => !open)}>
              {pagesOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </ToolButton>
            <div className="mx-1 h-5 w-px bg-white/10" />
            <ToolButton label="Zoom out" onClick={() => setZoom((value) => Math.max(50, value - 10))}><ZoomOut className="size-4" /></ToolButton>
            <span className="w-11 text-center text-xs text-white/60">{zoom}%</span>
            <ToolButton label="Zoom in" onClick={() => setZoom((value) => Math.min(180, value + 10))}><ZoomIn className="size-4" /></ToolButton>
            <ToolButton label="Rotate" onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw className="size-4" /></ToolButton>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ToolButton label="Previous page" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}><ChevronLeft className="size-4" /></ToolButton>
            <span className="px-2 text-xs text-white/60">
              Page <strong className="text-white">{currentPage}</strong> of {pageCount}
            </span>
            <ToolButton label="Next page" onClick={() => setCurrentPage((page) => Math.min(pageCount, page + 1))}><ChevronRight className="size-4" /></ToolButton>
            <ToolButton label="Full screen" onClick={() => void viewerRef.current?.requestFullscreen()}><Maximize2 className="size-4" /></ToolButton>
          </div>
        </div>

        <div ref={viewerRef} className="flex min-h-0 flex-1 overflow-hidden bg-[#18243a]">
          {pagesOpen && document.file_type === "pdf" && (
            <aside className="hidden w-40 shrink-0 overflow-y-auto border-r border-white/10 bg-[#0d1b30] p-3 sm:block">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">Pages</p>
              <div className="flex flex-col gap-3">
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) => (
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

          <main className="min-w-0 flex-1 overflow-auto p-3 sm:p-6 lg:p-8">
            <div className="mx-auto flex min-h-[70vh] max-w-5xl flex-col items-center gap-5">
              {document.file_type === "pdf" ? (
                <div className="relative flex min-h-[50vh] w-full justify-center">
                  {pageLoading && !pageError && <div className="absolute inset-x-0 top-16 mx-auto flex max-w-xs flex-col items-center gap-3 rounded-xl bg-[#10203a] p-5 text-center text-sm text-white/60"><LoaderDocumentPage /><span>Rendering page {currentPage}...</span></div>}
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
    </>
  );
}

function MobileDocumentViewer({
  document,
  downloadUrl,
  extractedText,
  pageCount,
  initialPage,
  highlightExcerpt,
}: {
  document: DocumentRecord;
  downloadUrl: string;
  extractedText: string | null;
  pageCount: number;
  initialPage: number;
  highlightExcerpt?: string | null;
}) {
  useEffect(() => {
    if (document.file_type !== "pdf" || initialPage <= 1) return;
    globalThis.document.getElementById(`mobile-pdf-page-${initialPage}`)?.scrollIntoView({ block: "start" });
  }, [document.file_type, initialPage]);

  return (
    <div className="min-h-screen bg-[#18243a] pb-20 text-white lg:hidden">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a1628]/95 px-3 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/documents" className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10" aria-label="Back to documents"><ChevronLeft className="size-4" /></Link>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{document.name}</p><p className="text-[11px] text-white/45">{document.file_type === "pdf" ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : document.file_type.toUpperCase()}</p></div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/conversations" className="flex size-9 items-center justify-center rounded-lg bg-white/10" aria-label="Ask AI"><MessageSquare className="size-4" /></Link>
            <a href={downloadUrl} className="flex size-9 items-center justify-center rounded-lg bg-theme-primary" aria-label="Download document"><Download className="size-4" /></a>
          </div>
        </div>
      </header>

      <main className="space-y-4 p-3">
        {highlightExcerpt && (
          <aside className="rounded-xl border border-amber-300/40 bg-amber-100 p-3 text-zinc-900">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-amber-800">Referenced content</p>
            <mark className="bg-amber-300 text-sm leading-6 text-zinc-950">{highlightExcerpt}</mark>
          </aside>
        )}
        {document.file_type === "pdf" ? (
          Array.from({ length: pageCount }, (_, index) => index + 1).map(page => (
            <MobilePdfPage key={page} documentId={document.id} documentName={document.name} page={page} />
          ))
        ) : (
          <article className="min-h-[70vh] whitespace-pre-wrap rounded-xl bg-white p-5 text-sm leading-7 text-zinc-700 shadow-xl">
            <div className="mb-5 flex items-center gap-2 border-b border-zinc-200 pb-4"><FileText className="size-5 text-theme-primary" /><h1 className="min-w-0 break-all font-bold text-zinc-900">{document.name}</h1></div>
            <HighlightedDocumentText text={extractedText || "No readable text was found in this document."} excerpt={highlightExcerpt} />
          </article>
        )}
      </main>
    </div>
  );
}

function MobilePdfPage({ documentId, documentName, page }: { documentId: string; documentName: string; page: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <section id={`mobile-pdf-page-${page}`} className="scroll-mt-20 overflow-hidden rounded-xl border border-white/10 bg-[#10203a] shadow-xl">
      <p className="px-3 py-2 text-xs font-semibold text-white/55">Page {page}</p>
      {failed ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-2 bg-white/5 p-5 text-center text-sm text-white/55"><AlertCircle className="size-6 text-red-300" /><span>Page {page} could not be displayed.</span></div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/documents/${documentId}/pages/${page}`} alt={`${documentName}, page ${page}`} loading={page === 1 ? "eager" : "lazy"} onError={() => setFailed(true)} className="h-auto w-full bg-white" />
      )}
    </section>
  );
}

function LoaderDocumentPage() {
  return <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-theme-primary" />;
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
