"use client";

import type { MessageSource } from "@/types";
import { ExternalLink, Loader2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Preview = {
  document: { id: string; name: string; fileType: "pdf" | "docx" | "txt" };
  pageNumber: number | null;
  pageCount: number;
  pageText: string;
  excerpt: string;
};

function HighlightedText({ text, excerpt }: { text: string; excerpt: string }) {
  const parts = useMemo(() => {
    const needle = excerpt.trim();
    if (!needle) return [{ text, highlighted: false }];
    const exact = text.toLowerCase().indexOf(needle.toLowerCase());
    if (exact >= 0) return [
      { text: text.slice(0, exact), highlighted: false },
      { text: text.slice(exact, exact + needle.length), highlighted: true },
      { text: text.slice(exact + needle.length), highlighted: false },
    ];
    return [{ text, highlighted: false }];
  }, [excerpt, text]);
  return <>{parts.map((part, index) => part.highlighted ? <mark key={index} className="rounded bg-amber-200 px-0.5 text-zinc-950">{part.text}</mark> : <span key={index}>{part.text}</span>)}</>;
}

export function CitationPreviewPanel({ source, onClose }: { source: MessageSource; onClose: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = new URLSearchParams({ excerpt: source.excerpt });
    if (source.pageNumber) query.set("page", String(source.pageNumber));
    setPreview(null);
    setError("");
    fetch(`/api/documents/${source.docId}/citation?${query}`)
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not load citation.");
        setPreview(body);
      })
      .catch(reason => setError(reason instanceof Error ? reason.message : "Could not load citation."));
  }, [source]);

  const page = preview?.pageNumber ?? source.pageNumber;
  const fullDocumentQuery = new URLSearchParams();
  if (page) fullDocumentQuery.set("page", String(page));
  fullDocumentQuery.set("highlight", source.excerpt);

  return (
    <>
      <button type="button" aria-label="Close citation preview" onClick={onClose} className="fixed inset-0 z-40 bg-black/35 lg:hidden" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 lg:static lg:z-auto lg:w-[420px] lg:shrink-0 lg:shadow-none">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-zinc-200 px-4 dark:border-zinc-800">
          <div className="min-w-0"><p className="truncate text-sm font-bold">{source.docName}</p><p className="text-xs text-zinc-500">{page ? `Page ${page}${preview?.pageCount ? ` of ${preview.pageCount}` : ""}` : "Referenced document text"}</p></div>
          <button onClick={onClose} className="flex size-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="size-4" /></button>
        </header>
        <div className="public-tool-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
          {!preview && !error && <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin text-theme-primary" /> Loading cited source...</div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>}
          {preview?.document.fileType === "pdf" && preview.pageNumber && <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"><Image src={`/api/documents/${source.docId}/pages/${preview.pageNumber}`} alt={`${source.docName}, page ${preview.pageNumber}`} width={900} height={1200} unoptimized className="h-auto w-full" /></div>}
          {preview && <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Referenced content</p><p className="whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200"><HighlightedText text={preview.pageText || preview.excerpt} excerpt={preview.excerpt} /></p>{!preview.pageText.toLowerCase().includes(preview.excerpt.toLowerCase()) && <blockquote className="mt-3 border-l-2 border-amber-500 pl-3 text-xs italic text-zinc-600 dark:text-zinc-300">{preview.excerpt}</blockquote>}</section>}
        </div>
        <footer className="border-t border-zinc-200 p-4 dark:border-zinc-800"><Link href={`/documents/${source.docId}?${fullDocumentQuery}`} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-theme-primary text-sm font-semibold text-white"><ExternalLink className="size-4" /> Open full document{page ? ` on page ${page}` : ""}</Link></footer>
      </aside>
    </>
  );
}
